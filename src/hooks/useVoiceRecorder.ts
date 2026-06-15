/**
 * Platform-aware voice recorder.
 *
 * Web:    MediaRecorder + AnalyserNode for real RMS silence detection
 * Native: expo-audio AudioRecorder with fixed auto-stop timer
 *
 * onAutoStop is called with the file URI when recording ends (auto or manual).
 */

import { Platform } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

const SILENCE_TIMEOUT_MS = 4000;  // 4 s → auto-stop
const MAX_DURATION_MS    = 60_000;
const SPEECH_THRESHOLD   = 0.015;
const POLL_INTERVAL_MS   = 120;

// ─── Web ─────────────────────────────────────────────────────────

function useWebVoiceRecorder(onAutoStop: (uri: string | null) => void) {
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef   = useRef<MediaRecorder | null>(null);
  const chunksRef          = useRef<Blob[]>([]);
  const audioCtxRef        = useRef<AudioContext | null>(null);
  const analyserRef        = useRef<AnalyserNode | null>(null);
  const pollTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStopCalledRef  = useRef(false);
  const stopResolveRef     = useRef<((url: string | null) => void) | null>(null);

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
      silenceTimerRef.current = setTimeout(triggerAutoStop, SILENCE_TIMEOUT_MS);

      pollTimerRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buf);
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
        const rms = Math.sqrt(sumSq / buf.length);
        if (rms > SPEECH_THRESHOLD) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(triggerAutoStop, SILENCE_TIMEOUT_MS);
          }
        }
      }, POLL_INTERVAL_MS);

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

function useNativeVoiceRecorder(onAutoStop: (uri: string | null) => void) {
  const [isRecording,       setIsRecording]       = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const recorder        = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStoppedRef  = useRef(false);
  const stopResolveRef  = useRef<((uri: string | null) => void) | null>(null);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current)     { clearTimeout(maxTimerRef.current);     maxTimerRef.current     = null; }
  }, []);

  // recordingStatusUpdate is the reliable way to get the URI after stop()
  useEffect(() => {
    const sub = recorder.addListener('recordingStatusUpdate', (status) => {
      if (status.isFinished) {
        const uri = status.url ?? recorder.uri ?? null;
        setIsRecording(false);
        clearTimers();
        if (stopResolveRef.current) {
          stopResolveRef.current(uri);
          stopResolveRef.current = null;
        } else if (autoStoppedRef.current) {
          onAutoStop(uri);
        }
      }
    });
    return () => sub.remove();
  }, [recorder, clearTimers, onAutoStop]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result  = await requestRecordingPermissionsAsync();
      const granted = result.granted;
      setPermissionGranted(granted);
      if (granted) {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      }
      return granted;
    } catch {
      return false;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      if (!permissionGranted) {
        const ok = await requestPermission();
        if (!ok) return false;
      }

      clearTimers();
      autoStoppedRef.current = false;
      stopResolveRef.current = null;

      // prepareToRecordAsync MUST be called before every record()
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);

      const doAutoStop = async () => {
        if (autoStoppedRef.current) return;
        autoStoppedRef.current = true;
        clearTimers();
        try {
          await recorder.stop();
          // URI delivered via recordingStatusUpdate listener
        } catch (err) {
          console.warn('[VoiceRecorder] Auto-stop error:', err);
          setIsRecording(false);
          onAutoStop(null);
        }
      };

      silenceTimerRef.current = setTimeout(doAutoStop, SILENCE_TIMEOUT_MS);
      maxTimerRef.current     = setTimeout(doAutoStop, MAX_DURATION_MS);

      return true;
    } catch (err) {
      console.warn('[VoiceRecorder] Native start failed:', err);
      setIsRecording(false);
      return false;
    }
  }, [recorder, permissionGranted, requestPermission, clearTimers, onAutoStop]);

  const stopRecording = useCallback((): Promise<string | null> => {
    return new Promise(async (resolve) => {
      clearTimers();
      autoStoppedRef.current = true;

      if (!recorder.isRecording) {
        // Auto-stop already fired and stopped it — resolve with current URI
        resolve(recorder.uri ?? null);
        return;
      }

      stopResolveRef.current = resolve;
      try {
        await recorder.stop();
        // URI delivered via recordingStatusUpdate → stopResolveRef
      } catch (err) {
        console.warn('[VoiceRecorder] Manual stop error:', err);
        stopResolveRef.current = null;
        setIsRecording(false);
        resolve(null);
      }
    });
  }, [recorder, clearTimers]);

  return { isRecording, requestPermission, startRecording, stopRecording };
}

// ─── Unified export ───────────────────────────────────────────────

export function useVoiceRecorder(onAutoStop: (uri: string | null) => void) {
  const web    = useWebVoiceRecorder(onAutoStop);
  const native = useNativeVoiceRecorder(onAutoStop);
  return Platform.OS === 'web' ? web : native;
}
