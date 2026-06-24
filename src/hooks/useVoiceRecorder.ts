/**
 * Platform-aware voice recorder.
 *
 * Web:    MediaRecorder + AnalyserNode silence detection
 * Native: expo-audio with manual stop + fallback timer
 *
 * Architecture:
 *   - useVoiceRecorder() returns ONE recorder based on Platform.OS.
 *   - The web and native hooks are defined separately and only the
 *     relevant one is called — they are NOT both instantiated on every
 *     render. This prevents `navigator` ReferenceErrors in the Android
 *     APK environment and avoids double MediaRecorder resource allocation.
 *
 * onAutoStop(uri) is called when the 8s timer fires.
 * stopRecording() returns Promise<uri | null> for manual stop.
 */

import { Platform } from 'react-native';
import { useCallback, useRef, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

const AUTO_STOP_MS    = 8000;
const MAX_DURATION_MS = 60_000;
// Extra flush time after recorder.stop() before reading recorder.uri.
// 300 ms is safe on both fast and slow Android hardware.
const FLUSH_MS = 300;

// ─── Web recorder ────────────────────────────────────────────────────────────

function useWebVoiceRecorder(onAutoStop: (uri: string | null) => void) {
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef         = useRef<Blob[]>([]);
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const pollTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStopCalledRef = useRef(false);
  const stopResolveRef    = useRef<((url: string | null) => void) | null>(null);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current)    { clearInterval(pollTimerRef.current);   pollTimerRef.current  = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current)     { clearTimeout(maxTimerRef.current);     maxTimerRef.current   = null; }
  }, []);

  const teardown = useCallback((mr: MediaRecorder) => {
    clearTimers();
    try { audioCtxRef.current?.close(); } catch { /* ignore */ }
    audioCtxRef.current = null;
    analyserRef.current = null;
    mr.stream.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, [clearTimers]);

  const triggerAutoStop = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || autoStopCalledRef.current) return;
    autoStopCalledRef.current = true;
    mr.onstop = () => {
      const mimeType = mr.mimeType || 'audio/webm';
      const blob     = new Blob(chunksRef.current, { type: mimeType });
      teardown(mr);
      chunksRef.current = [];
      const url = blob.size >= 200 ? URL.createObjectURL(blob) : null;
      if (stopResolveRef.current) { stopResolveRef.current(url); stopResolveRef.current = null; }
      onAutoStop(url);
    };
    mr.stop();
  }, [teardown, onAutoStop]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch { return false; }
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(
        m => MediaRecorder.isTypeSupported(m)
      ) ?? '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current         = [];
      autoStopCalledRef.current = false;
      stopResolveRef.current    = null;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorderRef.current = mr;
      mr.start(100);

      const audioCtx = new AudioContext();
      const source   = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const buf = new Float32Array(analyser.fftSize);
      let hasSpeech = false;
      silenceTimerRef.current = setTimeout(triggerAutoStop, AUTO_STOP_MS);

      pollTimerRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buf);
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
        const rms = Math.sqrt(sumSq / buf.length);
        if (rms > 0.015) {
          hasSpeech = true;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(triggerAutoStop, hasSpeech ? 3000 : AUTO_STOP_MS);
        }
      }, 120);

      maxTimerRef.current = setTimeout(triggerAutoStop, MAX_DURATION_MS);
      setIsRecording(true);
      return true;
    } catch (err) {
      console.warn('[VoiceRecorder] Web start failed:', err);
      return false;
    }
  }, [triggerAutoStop]);

  const stopRecording = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr) { resolve(null); return; }
      if (autoStopCalledRef.current) { resolve(null); return; }
      autoStopCalledRef.current = true;
      clearTimers();
      stopResolveRef.current = resolve;
      mr.onstop = () => {
        const mimeType = mr.mimeType || 'audio/webm';
        const blob     = new Blob(chunksRef.current, { type: mimeType });
        teardown(mr);
        chunksRef.current = [];
        const url = blob.size >= 200 ? URL.createObjectURL(blob) : null;
        if (stopResolveRef.current) { stopResolveRef.current(url); stopResolveRef.current = null; }
      };
      mr.stop();
    });
  }, [clearTimers, teardown]);

  return { isRecording, requestPermission, startRecording, stopRecording };
}

// ─── Native recorder ─────────────────────────────────────────────────────────

function useNativeVoiceRecorder(onAutoStopProp: (uri: string | null) => void) {
  const [isRecording,       setIsRecording]       = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const onAutoStopRef   = useRef(onAutoStopProp);
  onAutoStopRef.current = onAutoStopProp;

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStoppedRef  = useRef(false);
  const isRecordingRef  = useRef(false);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current)     { clearTimeout(maxTimerRef.current);     maxTimerRef.current     = null; }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      setPermissionGranted(granted);
      if (granted) {
        // setAudioModeAsync: only pass properties that expo-audio v56 accepts on
        // Android. interruptionMode is iOS-only in this SDK version — passing it
        // on Android throws and requestPermission() returns false even though the
        // OS granted microphone access, which silently breaks all voice recording.
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording:   true,   // iOS only — silently ignored on Android (safe)
        });
      }
      return granted;
    } catch (err) {
      console.warn('[VoiceRecorder] Permission/audio-mode error:', err);
      // Even if setAudioModeAsync throws, the OS permission was still granted.
      // Return the value we already stored rather than false.
      return permissionGranted ?? false;
    }
  }, [permissionGranted]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      if (!permissionGranted) {
        const ok = await requestPermission();
        if (!ok) return false;
      }

      clearTimers();
      autoStoppedRef.current = false;

      // prepareToRecordAsync MUST be called before every record() call.
      // After stop(), the recorder is in a finished state and record() alone
      // would throw without re-preparing.
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      isRecordingRef.current = true;

      const doAutoStop = async () => {
        if (autoStoppedRef.current)  return;
        if (!isRecordingRef.current) return;
        autoStoppedRef.current = true;
        clearTimers();

        try {
          await recorder.stop();
          isRecordingRef.current = false;
          setIsRecording(false);
          // Wait for the native layer to flush the .m4a file to disk.
          // 300 ms is required on slower Android devices; 150 ms is too short.
          await new Promise(r => setTimeout(r, FLUSH_MS));
          const uri = recorder.uri ?? null;
          onAutoStopRef.current(uri);
        } catch (err) {
          console.warn('[VoiceRecorder] Auto-stop failed:', err);
          isRecordingRef.current = false;
          setIsRecording(false);
          onAutoStopRef.current(null);
        }
      };

      silenceTimerRef.current = setTimeout(doAutoStop, AUTO_STOP_MS);
      maxTimerRef.current     = setTimeout(doAutoStop, MAX_DURATION_MS);
      return true;
    } catch (err) {
      console.warn('[VoiceRecorder] Native start failed:', err);
      setIsRecording(false);
      isRecordingRef.current = false;
      return false;
    }
  }, [recorder, permissionGranted, requestPermission, clearTimers]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    clearTimers();
    autoStoppedRef.current = true;

    if (!isRecordingRef.current) {
      // Already stopped by auto-stop timer — uri is already written
      return recorder.uri ?? null;
    }

    try {
      await recorder.stop();
      isRecordingRef.current = false;
      setIsRecording(false);
      // Same 300 ms flush as auto-stop — the manual path had 150 ms before,
      // which was too short on slow Android devices causing recorder.uri = null.
      await new Promise(r => setTimeout(r, FLUSH_MS));
      return recorder.uri ?? null;
    } catch (err) {
      console.warn('[VoiceRecorder] Manual stop failed:', err);
      isRecordingRef.current = false;
      setIsRecording(false);
      return null;
    }
  }, [recorder, clearTimers]);

  return { isRecording, requestPermission, startRecording, stopRecording };
}

// ─── Unified export ───────────────────────────────────────────────────────────
// IMPORTANT: Only ONE hook is called per render — the one matching Platform.OS.
// Previously both hooks were always called, which caused `navigator` reference
// errors in the Android APK environment (native JS context has no `navigator`)
// and wasted the native MediaRecorder resource. The conditional call below is
// valid because Platform.OS is a compile-time constant that never changes.

export function useVoiceRecorder(onAutoStop: (uri: string | null) => void) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (Platform.OS === 'web') return useWebVoiceRecorder(onAutoStop);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useNativeVoiceRecorder(onAutoStop);
}
