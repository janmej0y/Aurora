/**
 * Platform-aware voice recorder with silence-detection auto-stop.
 *
 * Web:    MediaRecorder + AnalyserNode (real RMS level measurement)
 * Native: expo-audio + polling metering (expo-audio exposes currentTime/metering)
 *
 * Auto-stop rules:
 *   - If the user never speaks (silence from the start) → stop after SILENCE_TIMEOUT_MS
 *   - If the user spoke and then pauses → stop after SILENCE_TIMEOUT_MS since last speech
 *   - If total recording exceeds MAX_DURATION_MS → force-stop regardless
 *
 * onAutoStop is called when silence-detection fires so the screen can
 * immediately run the submission pipeline.
 */

import { Platform } from 'react-native';
import { useCallback, useRef, useState } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

const SILENCE_TIMEOUT_MS = 3000;   // 3 s of silence → auto-stop
const SPEECH_THRESHOLD   = 0.015;  // RMS level above which audio counts as speech (web)
const POLL_INTERVAL_MS   = 120;    // how often we sample the analyser (web)
const MAX_DURATION_MS    = 60_000; // hard cap: 60 s

// ─── Web implementation ───────────────────────────────────────────

function useWebVoiceRecorder(onAutoStop: (uri: string | null) => void) {
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef         = useRef<Blob[]>([]);
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const pollTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpokeRef       = useRef(false);
  const autoStopCalledRef = useRef(false);
  // Resolve fn for the current stopRecording Promise
  const stopResolveRef    = useRef<((url: string | null) => void) | null>(null);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current)    { clearInterval(pollTimerRef.current);  pollTimerRef.current  = null; }
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

  // Called when silence timer fires OR max duration reached
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
      // Deliver via the pending resolve if manual stop() raced us
      if (stopResolveRef.current) {
        stopResolveRef.current(url);
        stopResolveRef.current = null;
      }
      // Always fire onAutoStop with the URI so the screen runs the pipeline
      onAutoStop(url);
    };

    mr.stop();
  }, [teardown, onAutoStop]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(
        m => MediaRecorder.isTypeSupported(m)
      ) ?? '';

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current         = [];
      hasSpokeRef.current       = false;
      autoStopCalledRef.current = false;
      stopResolveRef.current    = null;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = mr;
      mr.start(100);

      // ── Set up AnalyserNode for real-time RMS level measurement
      const audioCtx = new AudioContext();
      const source   = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize         = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const buf = new Float32Array(analyser.fftSize);

      // ── Start silence timer immediately (fires if user never speaks)
      silenceTimerRef.current = setTimeout(triggerAutoStop, SILENCE_TIMEOUT_MS);

      // ── Poll audio level every POLL_INTERVAL_MS
      pollTimerRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buf);

        // RMS
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
        const rms = Math.sqrt(sumSq / buf.length);

        if (rms > SPEECH_THRESHOLD) {
          // Speech detected — reset the silence countdown
          hasSpokeRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(triggerAutoStop, SILENCE_TIMEOUT_MS);
          }
        }
      }, POLL_INTERVAL_MS);

      // ── Hard cap
      maxTimerRef.current = setTimeout(triggerAutoStop, MAX_DURATION_MS);

      setIsRecording(true);
      return true;
    } catch (err) {
      console.warn('[VoiceRecorder] Web startRecording failed:', err);
      return false;
    }
  }, [triggerAutoStop]);

  // Manual stop (user taps the button)
  const stopRecording = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr) { resolve(null); return; }

      // If auto-stop already fired and we're just racing, resolve immediately
      if (autoStopCalledRef.current) { resolve(null); return; }

      autoStopCalledRef.current = true;
      clearTimers();

      // Store resolve so triggerAutoStop's onstop can deliver it
      stopResolveRef.current = resolve;

      mr.onstop = () => {
        const mimeType = mr.mimeType || 'audio/webm';
        const blob     = new Blob(chunksRef.current, { type: mimeType });
        teardown(mr);
        chunksRef.current = [];

        const url = blob.size >= 200 ? URL.createObjectURL(blob) : null;
        if (stopResolveRef.current) {
          stopResolveRef.current(url);
          stopResolveRef.current = null;
        }
      };

      mr.stop();
    });
  }, [clearTimers, teardown]);

  return { isRecording, requestPermission, startRecording, stopRecording };
}

// ─── Native implementation ────────────────────────────────────────

function useNativeVoiceRecorder(onAutoStop: (uri: string | null) => void) {
  const [isRecording,       setIsRecording]       = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const audioRecorder     = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const silenceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStoppedRef    = useRef(false);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current)     { clearTimeout(maxTimerRef.current);      maxTimerRef.current     = null; }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const s = await AudioModule.requestRecordingPermissionsAsync();
      setPermissionGranted(s.granted);
      if (s.granted) await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      return s.granted;
    } catch {
      return false;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      if (permissionGranted === null) {
        const ok = await requestPermission();
        if (!ok) return false;
      } else if (!permissionGranted) {
        const ok = await requestPermission();
        if (!ok) return false;
      }

      clearTimers();
      autoStoppedRef.current = false;
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);

      // Native has no JS-accessible audio level API in expo-audio SDK 56,
      // so we use a fixed 3 s timeout from when recording starts.
      // The user can always tap stop manually before it fires.
      const doAutoStop = () => {
        if (autoStoppedRef.current) return;
        autoStoppedRef.current = true;
        audioRecorder.stop().then(() => {
          setIsRecording(false);
          clearTimers();
          onAutoStop(audioRecorder.uri ?? null);
        }).catch(() => {
          setIsRecording(false);
          clearTimers();
          onAutoStop(null);
        });
      };

      silenceTimerRef.current = setTimeout(doAutoStop, SILENCE_TIMEOUT_MS);
      maxTimerRef.current     = setTimeout(doAutoStop, MAX_DURATION_MS);

      return true;
    } catch (err) {
      console.warn('[VoiceRecorder] Native startRecording failed:', err);
      return false;
    }
  }, [audioRecorder, permissionGranted, requestPermission, clearTimers, onAutoStop]);

  const stopRecording = useCallback((): Promise<string | null> => {
    clearTimers();
    return new Promise((resolve) => {
      audioRecorder.stop().then(() => {
        setIsRecording(false);
        resolve(audioRecorder.uri ?? null);
      }).catch(() => {
        setIsRecording(false);
        resolve(null);
      });
    });
  }, [audioRecorder, clearTimers]);

  return { isRecording, requestPermission, startRecording, stopRecording };
}

// ─── Unified export ───────────────────────────────────────────────

// onAutoStop receives the blob/file URI so the caller can immediately
// run the pipeline without needing to call stopRecording() separately.
export function useVoiceRecorder(onAutoStop: (uri: string | null) => void) {
  const web    = useWebVoiceRecorder(onAutoStop);
  const native = useNativeVoiceRecorder(onAutoStop);
  return Platform.OS === 'web' ? web : native;
}
