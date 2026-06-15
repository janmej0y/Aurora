/**
 * Platform-aware voice recorder.
 *
 * Web:    MediaRecorder + AnalyserNode silence detection
 * Native: expo-audio with manual stop + fallback timer
 *
 * onAutoStop(uri) is called when the timer fires.
 * stopRecording() returns a Promise<uri> for manual stop.
 */

import { Platform } from 'react-native';
import { useCallback, useRef, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

// Give users 8 seconds before auto-stopping — enough time to speak a full sentence
const AUTO_STOP_MS   = 8000;
const MAX_DURATION_MS = 60_000;

// ─── Web ─────────────────────────────────────────────────────────

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

      // Silence detection via AnalyserNode
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
          // Reset silence timer on speech — only auto-stop after 3s of silence AFTER speech
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

// ─── Native ───────────────────────────────────────────────────────

function useNativeVoiceRecorder(onAutoStopProp: (uri: string | null) => void) {
  const [isRecording,       setIsRecording]       = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Store callbacks in refs so timer callbacks always see the latest version
  const onAutoStopRef   = useRef(onAutoStopProp);
  onAutoStopRef.current = onAutoStopProp;

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStoppedRef  = useRef(false);
  const isRecordingRef  = useRef(false); // mirror of state, readable inside async callbacks

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current)     { clearTimeout(maxTimerRef.current);     maxTimerRef.current     = null; }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      setPermissionGranted(granted);
      if (granted) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,          // iOS: enables .playAndRecord AVAudioSession
          interruptionMode: 'doNotMix',   // Android: requests exclusive audio focus
        });
      }
      return granted;
    } catch (err) {
      console.warn('[VoiceRecorder] Permission error:', err);
      return false;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      // Always check permission freshly
      if (!permissionGranted) {
        const ok = await requestPermission();
        if (!ok) return false;
      }

      clearTimers();
      autoStoppedRef.current = false;

      // prepareToRecordAsync MUST be called before every record()
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      isRecordingRef.current = true;

      // Auto-stop: give user 8s to speak before we stop automatically
      const doAutoStop = async () => {
        if (autoStoppedRef.current) return;
        if (!isRecordingRef.current) return;
        autoStoppedRef.current = true;
        clearTimers();

        try {
          await recorder.stop();
          isRecordingRef.current = false;
          setIsRecording(false);
          // Wait a tick for the recorder to write the file
          await new Promise(r => setTimeout(r, 300));
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
      // Already stopped by auto-stop
      return recorder.uri ?? null;
    }

    try {
      await recorder.stop();
      isRecordingRef.current = false;
      setIsRecording(false);
      // Small delay to let the native layer flush the file
      await new Promise(r => setTimeout(r, 150));
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

// ─── Unified export ───────────────────────────────────────────────

export function useVoiceRecorder(onAutoStop: (uri: string | null) => void) {
  const web    = useWebVoiceRecorder(onAutoStop);
  const native = useNativeVoiceRecorder(onAutoStop);
  return Platform.OS === 'web' ? web : native;
}
