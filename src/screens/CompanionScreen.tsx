import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { CheckCircle, ChevronLeft, Copy, Edit3, Keyboard, Mic, RefreshCw, Send, Sparkles, Square, Volume2, X } from 'lucide-react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

import { useNavigation, useRoute } from '@react-navigation/native';
import { pingServer, sendAgentText, sendAgentVoice } from '../services/agentApi';
import { supabase } from '../lib/supabase';
import { useHealth } from '../store/HealthContext';
import { AgentAction } from '../types/health';
import { AuroraLaunchParams } from '../types/navigation';
import { colors, fontWeight, radius, shadow, shadowLg, spacing, type } from '../theme/tokens';

const useND = Platform.OS !== 'web';

// ─── UI states ───────────────────────────────────────────────────
// idle → listening → processing → confirming (if low confidence) → speaking
type UIStatus = 'idle' | 'listening' | 'processing' | 'confirming' | 'speaking';

// ─── Chips ───────────────────────────────────────────────────────
const ALL_CHIPS = [
  { id: 'week',    emoji: '📊', label: 'How am I doing?',  text: 'How am I doing this week?' },
  { id: 'water',   emoji: '💧', label: 'Log water',        text: 'I drank 500ml of water' },
  { id: 'sleep',   emoji: '🌙', label: 'Log sleep',        text: 'I slept 7 hours last night' },
  { id: 'habits',  emoji: '✅', label: 'My habits',         text: 'What habits should I focus on today?' },
  { id: 'meal',    emoji: '🍽', label: 'Log meal',          text: 'I had lunch' },
  { id: 'energy',  emoji: '⚡', label: 'Energy tips',       text: 'How can I improve my energy levels?' },
  { id: 'insight', emoji: '🔍', label: 'Health patterns',   text: 'What pattern do you notice in my health?' },
];

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch { return ''; }
}

// ─── Parse AI lines — colored metric rows ────────────────────────
const METRIC_PATTERNS: { emoji: string; color: string }[] = [
  { emoji: '💧', color: colors.blue },
  { emoji: '🌙', color: '#8B5CF6' },
  { emoji: '🎯', color: colors.emerald },
  { emoji: '🔴', color: colors.coral },
  { emoji: '✅', color: colors.emerald },
  { emoji: '🔥', color: '#F97316' },
  { emoji: '⚡', color: colors.amber },
  { emoji: '🏃', color: colors.emerald },
  { emoji: '📊', color: colors.blue },
];

function AIMessageContent({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 2 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={i} style={{ height: 5 }} />;
        const meta = METRIC_PATTERNS.find(p => trimmed.startsWith(p.emoji));
        if (meta) {
          const match = trimmed.match(/^(.*?)\s+([\d.,]+\s*\S*)$/);
          if (match) {
            return (
              <View key={i} style={cs.metricRow}>
                <Text style={cs.metricLabel}>{match[1]}</Text>
                <Text style={[cs.metricValue, { color: meta.color }]}>{match[2]}</Text>
              </View>
            );
          }
        }
        return <Text key={i} style={cs.bubbleText}>{line}</Text>;
      })}
    </View>
  );
}

// ─── Typing dots ──────────────────────────────────────────────────
function TypingDots() {
  const d1 = useRef(new Animated.Value(0.25)).current;
  const d2 = useRef(new Animated.Value(0.25)).current;
  const d3 = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const make = (v: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1,    duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: useND }),
        Animated.timing(v, { toValue: 0.25, duration: 300, easing: Easing.in(Easing.ease),  useNativeDriver: useND }),
        Animated.delay(Math.max(0, 600 - delay)),
      ]));
    const a1 = make(d1, 0); const a2 = make(d2, 200); const a3 = make(d3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);
  const dot = (v: Animated.Value) => ({
    width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.inkSoft,
    opacity: v,
    transform: [{ scale: v.interpolate({ inputRange: [0.25, 1], outputRange: [0.7, 1.1] }) }],
  });
  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 5 }}>
      <Animated.View style={dot(d1)} /><Animated.View style={dot(d2)} /><Animated.View style={dot(d3)} />
    </View>
  );
}

// ─── Waveform bars ────────────────────────────────────────────────
function WaveformBars({ active, count = 7 }: { active: boolean; count?: number }) {
  const bars = useRef(Array.from({ length: count }, () => new Animated.Value(0.15))).current;
  const PEAKS  = [0.4, 0.7, 0.95, 1.0, 0.9, 0.65, 0.35];
  const SPEEDS = [380, 280, 320, 260, 340, 300, 420];
  useEffect(() => {
    if (!active) { bars.forEach(b => b.setValue(0.15)); return; }
    const loops = bars.map((b, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 60),
        Animated.timing(b, { toValue: PEAKS[i % PEAKS.length],  duration: SPEEDS[i % SPEEDS.length], easing: Easing.inOut(Easing.ease), useNativeDriver: useND }),
        Animated.timing(b, { toValue: 0.12, duration: SPEEDS[i % SPEEDS.length] * 0.75, easing: Easing.inOut(Easing.ease), useNativeDriver: useND }),
      ]))
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [active]);
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', height: 32 }}>
      {bars.map((b, i) => (
        <Animated.View key={i} style={{
          width: 3, height: 32, borderRadius: 2, backgroundColor: colors.emerald,
          transform: [{ scaleY: b }],
          opacity: b.interpolate({ inputRange: [0.1, 1], outputRange: [0.35, 1] }),
        }} />
      ))}
    </View>
  );
}

// ─── Voice orb ───────────────────────────────────────────────────
function VoiceOrb({ active }: { active: boolean }) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const glow   = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    if (!active) { pulse1.setValue(1); pulse2.setValue(1); glow.setValue(0.3); return; }
    const p1 = Animated.loop(Animated.sequence([
      Animated.timing(pulse1, { toValue: 1.14, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: useND }),
      Animated.timing(pulse1, { toValue: 1,    duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: useND }),
    ]));
    const p2 = Animated.loop(Animated.sequence([
      Animated.delay(300),
      Animated.timing(pulse2, { toValue: 1.22, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: useND }),
      Animated.timing(pulse2, { toValue: 1,    duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: useND }),
    ]));
    const g = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 0.65, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: useND }),
      Animated.timing(glow, { toValue: 0.3,  duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: useND }),
    ]));
    p1.start(); p2.start(); g.start();
    return () => { p1.stop(); p2.stop(); g.stop(); };
  }, [active]);
  return (
    <View style={cs.orbWrap}>
      <Animated.View style={[cs.orbRing3, { transform: [{ scale: pulse2 }], opacity: glow.interpolate({ inputRange: [0.3, 0.65], outputRange: [0.12, 0.22] }) }]} />
      <Animated.View style={[cs.orbRing2, { transform: [{ scale: pulse1 }], opacity: glow.interpolate({ inputRange: [0.3, 0.65], outputRange: [0.22, 0.4] }) }]} />
      <Animated.View style={{ transform: [{ scale: pulse1.interpolate({ inputRange: [1, 1.14], outputRange: [1, 1.04] }) }] }}>
        <Svg width={220} height={220} viewBox="0 0 220 220">
          <Defs>
            <RadialGradient id="orbBody" cx="45%" cy="35%" r="65%">
              <Stop offset="0%"   stopColor="#22D3EE" stopOpacity="0.95" />
              <Stop offset="30%"  stopColor="#8B5CF6" stopOpacity="0.8" />
              <Stop offset="65%"  stopColor="#1E1040" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#060B14" stopOpacity="1" />
            </RadialGradient>
            <RadialGradient id="orbAmbient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor="#06B6D4" stopOpacity="0.18" />
              <Stop offset="60%"  stopColor="#7C3AED" stopOpacity="0.06" />
              <Stop offset="100%" stopColor="#060B14" stopOpacity="0" />
            </RadialGradient>
            <SvgLinearGradient id="rimLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor="#06B6D4" stopOpacity="0.5" />
              <Stop offset="50%"  stopColor="#8B5CF6" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#22C55E" stopOpacity="0.1" />
            </SvgLinearGradient>
          </Defs>
          <Circle cx={110} cy={110} r={105} fill="url(#orbAmbient)" />
          <Circle cx={110} cy={110} r={82}  fill="url(#orbBody)" />
          <Circle cx={110} cy={110} r={82}  fill="none" stroke="url(#rimLight)" strokeWidth={1.5} />
          <Circle cx={90}  cy={85}  r={22}  fill="#06B6D4" opacity={0.18} />
          <Circle cx={84}  cy={80}  r={10}  fill="#FFFFFF"  opacity={0.08} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Full-screen voice overlay ────────────────────────────────────
function VoiceOverlay({
  uiStatus,
  pendingTranscript,
  onStop,
  onCancel,
  onKeyboard,
  onConfirm,
  onRetry,
}: {
  uiStatus: UIStatus;
  pendingTranscript: string;
  onStop:     () => void;
  onCancel:   () => void;
  onKeyboard: () => void;
  onConfirm:  () => void;
  onRetry:    () => void;
}) {
  const isListening  = uiStatus === 'listening';
  const isProcessing = uiStatus === 'processing';
  const isConfirming = uiStatus === 'confirming';

  // ── Confirmation card (low-confidence transcript)
  if (isConfirming) {
    return (
      <View style={cs.voiceScreen}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={cs.voiceTopBar}>
            <Sparkles size={15} color={colors.emerald} strokeWidth={2} />
            <Text style={cs.voiceTopTitle}>Aurora</Text>
          </View>
          <View style={cs.voiceCenter}>
            <View style={cs.confirmCard}>
              <Text style={cs.confirmTitle}>I heard:</Text>
              <Text style={cs.confirmTranscript}>"{pendingTranscript}"</Text>
              <Text style={cs.confirmHint}>Is that right?</Text>
              <View style={cs.confirmActions}>
                <TouchableOpacity style={cs.confirmRetry} onPress={onRetry}>
                  <RefreshCw size={18} color={colors.inkSoft} strokeWidth={2} />
                  <Text style={cs.confirmRetryText}>Try again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={cs.confirmOk} onPress={onConfirm}>
                  <CheckCircle size={18} color={colors.background} strokeWidth={2.5} />
                  <Text style={cs.confirmOkText}>Yes, send it</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={cs.voiceControls}>
            <TouchableOpacity style={cs.voiceCtrlBtn} onPress={onCancel}>
              <X size={22} color={colors.ink} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={cs.voiceCtrlBtn} onPress={onKeyboard}>
              <Keyboard size={22} color={colors.ink} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Listening / processing view
  // Tap the orb OR the big bottom button to stop and send
  return (
    <View style={cs.voiceScreen}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={cs.voiceTopBar}>
          <Sparkles size={15} color={colors.emerald} strokeWidth={2} />
          <Text style={cs.voiceTopTitle}>Aurora</Text>
          <TouchableOpacity onPress={onCancel} style={cs.voiceCancelX}>
            <X size={18} color={colors.inkSoft} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Orb — tap to stop while listening */}
        <TouchableOpacity
          style={cs.voiceCenter}
          onPress={isListening ? onStop : undefined}
          activeOpacity={isListening ? 0.8 : 1}
        >
          <VoiceOrb active={isListening} />
          <Text style={cs.voiceStatus}>
            {isListening  ? "I'm listening..."
            : isProcessing ? 'Processing...'
            : 'Starting...'}
          </Text>
          <Text style={cs.voiceSubtext}>
            {isListening  ? 'Tap ■ when done, or wait 8s'
            : isProcessing ? 'Just a moment...'
            : 'Opening microphone...'}
          </Text>
        </TouchableOpacity>

        {/* Waveform */}
        <View style={cs.voiceWaveRow}>
          <WaveformBars active={isListening} count={7} />
        </View>

        {/* Controls: X  |  big STOP/MIC button  |  keyboard */}
        <View style={cs.voiceControls}>
          <TouchableOpacity style={cs.voiceCtrlBtn} onPress={onCancel}>
            <X size={22} color={colors.ink} strokeWidth={2} />
          </TouchableOpacity>

          {/* Big centre button: stop (while listening) or spinner (processing) */}
          <TouchableOpacity
            style={[cs.voiceMicBtn, isProcessing && { backgroundColor: '#334155' }]}
            onPress={isListening ? onStop : undefined}
            disabled={isProcessing}
            activeOpacity={0.75}
          >
            {isProcessing
              ? <Text style={{ color: colors.emerald, fontSize: 11, fontWeight: '700' }}>...</Text>
              : isListening
                ? <Square size={22} color={colors.background} strokeWidth={2.5} fill={colors.background} />
                : <Mic    size={24} color={colors.background} strokeWidth={2.5} />
            }
          </TouchableOpacity>

          <TouchableOpacity style={cs.voiceCtrlBtn} onPress={onKeyboard}>
            <Keyboard size={22} color={colors.ink} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Tap hint */}
        {isListening && (
          <Text style={cs.voiceTapHint}>Speak now • Tap ■ to send early</Text>
        )}
      </SafeAreaView>
    </View>
  );
}

// ─── Action confirmation banner ───────────────────────────────────
function ActionBanner({ intent, onDismiss }: { intent: string; onDismiss: () => void }) {
  const slide = useRef(new Animated.Value(-60)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: useND, tension: 180, friction: 14 }).start();
    const t = setTimeout(() => {
      Animated.timing(slide, { toValue: -80, duration: 300, useNativeDriver: useND }).start(onDismiss);
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  const label = intent === 'log_water'    ? '💧 Water logged'
              : intent === 'log_sleep'    ? '🌙 Sleep logged'
              : intent === 'create_habit' ? '✅ Habit created'
              : intent === 'log_meal'     ? '🍽 Meal logged'
              : intent === 'complete_habit' ? '🎯 Habit completed'
              : null;

  if (!label) return null;

  return (
    <Animated.View style={[cs.actionBanner, { transform: [{ translateY: slide }] }]}>
      <Text style={cs.actionBannerText}>{label}</Text>
      <TouchableOpacity onPress={onDismiss}>
        <X size={14} color={colors.emerald} strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────
export function CompanionScreen() {
  const { state, addChatMessage, applyAgentActions } = useHealth();
  const navigation   = useNavigation<any>();
  const route        = useRoute<any>();
  const launchParams = (route.params ?? {}) as AuroraLaunchParams;

  const [input,              setInput]              = useState('');
  const [busy,               setBusy]               = useState(false);
  const [uiStatus,           setUiStatus]           = useState<UIStatus>('idle');
  const [voiceMode,          setVoiceMode]          = useState(false);
  const [isSpeaking,         setIsSpeaking]         = useState(false);
  const [permissionGranted,  setPermissionGranted]  = useState<boolean | null>(null);
  const [pendingTranscript,  setPendingTranscript]  = useState('');
  const [lastIntent,         setLastIntent]         = useState<string | null>(null);
  const [showBanner,         setShowBanner]         = useState(false);
  const [serverReady,        setServerReady]        = useState<boolean | null>(null);

  const scrollRef        = useRef<ScrollView>(null);
  const handledLaunchRef = useRef<string | undefined>(undefined);
  // Store pending pipeline result during confirmation wait
  const pendingResultRef = useRef<{ reply: string; actions: AgentAction[]; intent?: string } | null>(null);

  // runVoicePipeline is defined below but referenced here — use a ref to avoid circular deps
  const pipelineRef = useRef<((uri: string | null) => Promise<void>) | null>(null);

  const onAutoStop = useCallback((uri: string | null) => {
    // Silence-detection fired — skip waiting for manual tap, run pipeline now
    setUiStatus('processing');
    setBusy(true);
    pipelineRef.current?.(uri);
  }, []);

  const { isRecording, requestPermission, startRecording: recorderStart, stopRecording: recorderStop } = useVoiceRecorder(onAutoStop);

  // Request mic permission + ping server on mount
  useEffect(() => {
    requestPermission().then(ok => setPermissionGranted(ok)).catch(() => setPermissionGranted(false));
    // Wake up Render server in background — free tier sleeps after 15min
    pingServer().then(ok => setServerReady(ok)).catch(() => setServerReady(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [state.chatMessages.length, busy]);

  // ── TTS ──────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    Speech.stop();
    setIsSpeaking(true);
    setUiStatus('speaking');
    const sentences = text.match(/[^.!?…]+[.!?…]+/g)?.map(s => s.trim()).filter(Boolean) ?? [text];
    const speakNext = (idx: number) => {
      if (idx >= sentences.length) { setIsSpeaking(false); setUiStatus('idle'); return; }
      Speech.speak(sentences[idx], {
        rate: 0.88, pitch: 1.06, language: 'en-US',
        onDone:    () => speakNext(idx + 1),
        onError:   () => { setIsSpeaking(false); setUiStatus('idle'); },
        onStopped: () => { setIsSpeaking(false); setUiStatus('idle'); },
      });
    };
    speakNext(0);
  }, []);

  const stopSpeaking = useCallback(() => { Speech.stop(); setIsSpeaking(false); setUiStatus('idle'); }, []);

  // ── Sync chat message to Supabase ─────────────────────────────────
  const syncMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      supabase.from('chat_messages').insert({ user_id: user.id, role, content }).then(() => undefined);
    } catch { /* non-critical */ }
  }, []);

  // ── Apply pipeline result ─────────────────────────────────────────
  const applyResult = useCallback((reply: string, actions: AgentAction[] = [], intent?: string) => {
    applyAgentActions(actions);
    addChatMessage({ role: 'assistant', content: reply });
    syncMessage('assistant', reply);
    if (intent) { setLastIntent(intent); setShowBanner(true); }
    setServerReady(true); // server responded successfully
    setBusy(false);
    speak(reply);
  }, [applyAgentActions, addChatMessage, syncMessage, speak]);

  // ── Send text ─────────────────────────────────────────────────────
  const sendText = useCallback(async (message?: string) => {
    const msg = (message ?? input).trim();
    if (!msg || busy) return;
    setInput('');
    addChatMessage({ role: 'user', content: msg });
    syncMessage('user', msg);
    setBusy(true);
    setUiStatus('processing');
    try {
      const res = await sendAgentText(msg, state);
      applyResult(res.reply, res.actions, res.intent);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '';
      const isTimeout = errMsg.includes('timed out') || errMsg.includes('waking up');
      const fallback = isTimeout
        ? "The server is waking up from sleep. Wait 30 seconds and try again."
        : "Couldn't reach the Aurora server. Check your connection and try again.";
      addChatMessage({ role: 'assistant', content: fallback });
      speak(fallback);
      setBusy(false);
      setUiStatus('idle');
      setServerReady(false);
    }
  }, [input, busy, state, addChatMessage, syncMessage, applyResult, speak]);

  // ── Start recording ───────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (busy || isRecording) return;
    if (isSpeaking) stopSpeaking();

    // Ensure permission
    let hasPermission = permissionGranted;
    if (!hasPermission) {
      hasPermission = await requestPermission();
      setPermissionGranted(hasPermission);
    }
    if (!hasPermission) {
      Alert.alert('Microphone needed', 'Enable microphone access in Settings to use voice.');
      return;
    }

    setVoiceMode(true);
    setUiStatus('idle'); // show "Starting..." until mic actually opens
    const ok = await recorderStart();
    if (ok) {
      setUiStatus('listening');
    } else {
      setVoiceMode(false);
      setUiStatus('idle');
      Alert.alert('Could not start recording', 'Check microphone permissions and try again.');
    }
  }, [busy, isRecording, isSpeaking, stopSpeaking, permissionGranted, requestPermission, recorderStart]);

  // ── Core voice pipeline — called by both manual stop and auto-stop ──
  const runVoicePipeline = useCallback(async (uri: string | null) => {
    if (!uri) {
      setVoiceMode(false); setBusy(false); setUiStatus('idle');
      return;
    }
    try {
      const res = await sendAgentVoice(uri, state);

      if (res.error === 'no_audio') {
        // Audio never arrived — silent fail, don't show error message
        setVoiceMode(false); setBusy(false); setUiStatus('idle');
        return;
      }
      if (res.error === 'no_transcript' || res.error === 'unclear' || res.error === 'no_audio') {
        setVoiceMode(false); setBusy(false); setUiStatus('idle');
        // Don't add a message — just close the overlay silently so user can try again
        return;
      }
      if (!res.transcript && !res.reply) {
        setVoiceMode(false); setBusy(false); setUiStatus('idle');
        return;
      }
      if (res.error === 'low_confidence' || (res.needsConfirmation && res.transcript)) {
        setPendingTranscript(res.transcript ?? '');
        pendingResultRef.current = { reply: res.reply ?? '', actions: res.actions ?? [], intent: res.intent };
        setUiStatus('confirming');
        setBusy(false);
        return;
      }

      // Auto-proceed (high confidence ≥ 0.7)
      setVoiceMode(false);
      if (res.transcript) {
        addChatMessage({ role: 'user', content: res.transcript });
        syncMessage('user', res.transcript);
      }
      applyResult(res.reply, res.actions, res.intent);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[Aurora] Voice pipeline error:', errMsg);
      setVoiceMode(false);
      setBusy(false);
      setUiStatus('idle');
      // Only show error message if it's a real network/server error
      // (not a silent failure like empty audio)
      const isNetworkError = errMsg.includes('fetch') || errMsg.includes('network') ||
                             errMsg.includes('Network') || errMsg.includes('timeout') ||
                             errMsg.includes('500') || errMsg.includes('ECONNREFUSED');
      if (isNetworkError) {
        const fallback = "Can't reach the Aurora server right now. Check your connection.";
        addChatMessage({ role: 'assistant', content: fallback });
        speak(fallback);
      }
    }
  }, [state, addChatMessage, syncMessage, applyResult, speak]);

  // Keep ref in sync so onAutoStop (created before runVoicePipeline) can call it
  useEffect(() => { pipelineRef.current = runVoicePipeline; }, [runVoicePipeline]);

  // ── Manual stop (user taps button/orb) ────────────────────────────
  const stopRecording = useCallback(async () => {
    if (!isRecording) return; // already stopped by auto-stop
    setUiStatus('processing');
    setBusy(true);
    const uri = await recorderStop();
    if (uri) {
      await runVoicePipeline(uri);
    } else {
      // Auto-stop already handled it, or no audio was captured
      setVoiceMode(false);
      setBusy(false);
      setUiStatus('idle');
    }
  }, [isRecording, recorderStop, runVoicePipeline]);

  // ── Confirm pending transcript ────────────────────────────────────
  const confirmTranscript = useCallback(() => {
    setVoiceMode(false);
    const pending = pendingResultRef.current;
    if (pendingTranscript) {
      addChatMessage({ role: 'user', content: pendingTranscript });
      syncMessage('user', pendingTranscript);
    }
    if (pending) {
      applyResult(pending.reply, pending.actions, pending.intent);
    } else {
      setBusy(false);
      setUiStatus('idle');
    }
    setPendingTranscript('');
    pendingResultRef.current = null;
  }, [pendingTranscript, addChatMessage, syncMessage, applyResult]);

  // ── Retry from confirmation ───────────────────────────────────────
  const retryRecording = useCallback(async () => {
    setPendingTranscript('');
    pendingResultRef.current = null;
    setBusy(false);
    setUiStatus('listening');
    setTimeout(async () => {
      const ok = await recorderStart();
      if (!ok) { setVoiceMode(false); setUiStatus('idle'); }
    }, 300);
  }, [recorderStart]);

  // ── Cancel voice entirely ─────────────────────────────────────────
  const cancelVoice = useCallback(async () => {
    try { if (isRecording) await recorderStop(); } catch { /* ignore */ }
    setPendingTranscript('');
    pendingResultRef.current = null;
    setVoiceMode(false);
    setUiStatus('idle');
    setBusy(false);
  }, [isRecording, recorderStop]);

  // ── Auto-start from HomeScreen "Talk to Aurora" button ───────────
  useEffect(() => {
    const launchId = launchParams.launchId;
    if (!launchParams.autoStartVoice || !launchId || handledLaunchRef.current === launchId) return;
    if (busy || isRecording || uiStatus === 'processing') return;
    handledLaunchRef.current = launchId;
    const t = setTimeout(() => startRecording().catch(() => setUiStatus('idle')), 300);
    return () => clearTimeout(t);
  }, [busy, isRecording, launchParams, uiStatus, startRecording]);

  const messages    = state.chatMessages.slice(1);
  const hasMessages = messages.length > 0;
  const isWorking   = uiStatus === 'processing';

  return (
    <SafeAreaView style={cs.screen}>

      {/* ── Server offline banner ── */}
      {serverReady === false && (
        <View style={cs.offlineBanner}>
          <Text style={cs.offlineBannerText}>⚠ Server is waking up — first message may take 30s</Text>
        </View>
      )}

      {/* ── Action confirmation banner ── */}
      {showBanner && lastIntent && (
        <ActionBanner intent={lastIntent} onDismiss={() => setShowBanner(false)} />
      )}

      {/* ── Header ── */}
      <View style={cs.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={cs.iconBtn}>
          <ChevronLeft size={20} color={colors.ink} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={cs.headerCenter}>
          <View style={cs.headerTitleRow}>
            <Sparkles size={14} color={colors.emerald} strokeWidth={2} />
            <Text style={cs.headerTitle}>Aurora</Text>
            {uiStatus !== 'idle' && (
              <View style={cs.statusPill}>
                <Text style={cs.statusText}>
                  {uiStatus === 'listening'   ? 'Listening'
                  : uiStatus === 'processing' ? 'Thinking'
                  : uiStatus === 'confirming' ? 'Confirm'
                  : 'Speaking'}
                </Text>
              </View>
            )}
          </View>
          <Text style={cs.headerSubtitle}>Your AI Health Companion</Text>
        </View>
        <TouchableOpacity
          onPress={isSpeaking ? stopSpeaking : undefined}
          style={[cs.iconBtn, isSpeaking && cs.iconBtnActive]}
        >
          <Volume2 size={18} color={isSpeaking ? colors.emerald : colors.muted} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={cs.messageScroll}
        contentContainerStyle={[cs.messages, !hasMessages && cs.messagesCenter]}
      >
        {!hasMessages && (
          <View style={cs.emptyState}>
            <Svg width={160} height={160} viewBox="0 0 160 160">
              <Defs>
                <RadialGradient id="emptyGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%"   stopColor="#06B6D4" stopOpacity="0.28" />
                  <Stop offset="60%"  stopColor="#8B5CF6" stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#090D14" stopOpacity="0" />
                </RadialGradient>
                <SvgLinearGradient id="emptyRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%"   stopColor="#06B6D4" />
                  <Stop offset="50%"  stopColor="#8B7BFF" />
                  <Stop offset="100%" stopColor="#22C55E" />
                </SvgLinearGradient>
              </Defs>
              <Circle cx={80} cy={80} r={75} fill="url(#emptyGlow)" />
              <Circle cx={80} cy={80} r={58} fill="none" stroke="url(#emptyRing)" strokeWidth={1.5} strokeDasharray="8 6 12 8" opacity={0.5} transform="rotate(15 80 80)" />
              <Circle cx={80} cy={80} r={44} fill="none" stroke="url(#emptyRing)" strokeWidth={1}   strokeDasharray="5 7 3 5"  opacity={0.3} transform="rotate(-45 80 80)" />
              <Circle cx={80} cy={80} r={30} fill="#111622" stroke="#1D2433" strokeWidth={1.5} />
              <Circle cx={80} cy={80} r={22} fill="none" stroke="#22C55E" strokeWidth={1.5} opacity={0.4} />
            </Svg>
            <Text style={cs.emptyTitle}>How can I help you?</Text>
            <Text style={cs.emptySubtitle}>Log water, sleep, habits, meals — or ask anything about your health.</Text>
            <View style={cs.emptyChips}>
              {ALL_CHIPS.slice(0, 3).map(chip => (
                <TouchableOpacity key={chip.id} onPress={() => sendText(chip.text)} style={cs.emptyChip} disabled={busy}>
                  <Text style={cs.emptyChipEmoji}>{chip.emoji}</Text>
                  <Text style={cs.emptyChipText}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map((msg, idx, arr) => {
          const isLast = idx === arr.length - 1;
          const isUser = msg.role === 'user';
          const time   = formatTime(msg.createdAt);

          if (isUser) {
            return (
              <View key={msg.id} style={cs.userRow}>
                <View style={cs.userBubble}>
                  <Text style={cs.userBubbleText}>{msg.content}</Text>
                </View>
                <View style={cs.userMeta}>
                  <Text style={cs.metaTime}>{time}</Text>
                  {isLast && <Text style={cs.readReceipt}>✓✓</Text>}
                </View>
              </View>
            );
          }

          return (
            <View key={msg.id} style={cs.aiRow}>
              <View style={cs.aiAvatar}>
                <Sparkles size={11} color={colors.background} strokeWidth={2.5} />
              </View>
              <View style={cs.aiBubbleCol}>
                <View style={cs.aiBubble}>
                  <AIMessageContent text={msg.content} />
                </View>
                <View style={cs.aiMeta}>
                  <Text style={cs.metaTime}>{time}</Text>
                  <TouchableOpacity style={cs.copyBtn} onPress={() => {}}>
                    <Copy size={12} color={colors.subtle} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {isWorking && (
          <View style={cs.aiRow}>
            <View style={cs.aiAvatar}>
              <Sparkles size={11} color={colors.background} strokeWidth={2.5} />
            </View>
            <View style={cs.aiBubble}>
              <TypingDots />
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Quick chips ── */}
      {hasMessages && !busy && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cs.chipsScroll} contentContainerStyle={cs.chipsContent}>
          {ALL_CHIPS.map(chip => (
            <TouchableOpacity key={chip.id} onPress={() => sendText(chip.text)} style={cs.chip} disabled={busy}>
              <Text style={cs.chipEmoji}>{chip.emoji}</Text>
              <Text style={cs.chipLabel}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Composer ── */}
      <View style={cs.composerWrap}>
        <View style={cs.composer}>
          <TouchableOpacity onPress={startRecording} disabled={busy} style={[cs.micBtn, busy && { opacity: 0.5 }]}>
            <Mic size={20} color={colors.background} strokeWidth={2.5} />
          </TouchableOpacity>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.subtle}
            style={cs.textInput}
            multiline
            maxLength={600}
            editable={!busy}
          />
          <TouchableOpacity
            onPress={() => sendText()}
            disabled={!input.trim() || busy}
            style={[cs.sendBtn, input.trim() && !busy && cs.sendBtnActive]}
          >
            <Send size={16} color={input.trim() && !busy ? colors.background : colors.subtle} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      </KeyboardAvoidingView>

      {/* ── Full-screen voice overlay ── */}
      <Modal visible={voiceMode} transparent={false} animationType="fade" statusBarTranslucent onRequestClose={cancelVoice}>
        <VoiceOverlay
          uiStatus={uiStatus}
          pendingTranscript={pendingTranscript}
          onStop={stopRecording}
          onCancel={cancelVoice}
          onKeyboard={cancelVoice}
          onConfirm={confirmTranscript}
          onRetry={retryRecording}
        />
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const cs = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0D1117' },

  // Server offline banner
  offlineBanner: {
    backgroundColor: '#7C2D12', paddingHorizontal: spacing.lg, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  offlineBannerText: { color: '#FED7AA', fontSize: 12, fontWeight: fontWeight.bold, flex: 1, textAlign: 'center' },

  // Action banner
  actionBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: `${colors.emerald}22`,
    borderBottomWidth: 1, borderBottomColor: `${colors.emerald}33`,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  actionBannerText: { color: colors.emerald, fontSize: type.small, fontWeight: fontWeight.black },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: '#0D1117', borderBottomWidth: 1, borderBottomColor: '#161D27',
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    borderWidth: 1, borderColor: '#1E2835', backgroundColor: '#131A23',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive:    { borderColor: colors.emerald },
  headerCenter:     { alignItems: 'center', gap: 1 },
  headerTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  headerTitle:      { color: colors.ink, fontSize: type.body, fontWeight: fontWeight.black },
  headerSubtitle:   { color: '#4A5568', fontSize: 11, fontWeight: fontWeight.medium, letterSpacing: 0.2 },
  statusPill: {
    backgroundColor: `${colors.emerald}22`, borderRadius: radius.full,
    paddingHorizontal: 7, paddingVertical: 2, marginLeft: 4,
  },
  statusText: { color: colors.emerald, fontSize: 9, fontWeight: fontWeight.black, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Messages
  messageScroll: { flex: 1, backgroundColor: '#0D1117' },
  messages:      { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm, gap: 14 },
  messagesCenter: { flexGrow: 1, justifyContent: 'center' },

  // Empty state
  emptyState:    { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xl },
  emptyTitle:    { color: colors.ink, fontSize: 20, fontWeight: fontWeight.black, textAlign: 'center' },
  emptySubtitle: { color: '#4A5568', fontSize: type.small, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.lg },
  emptyChips:    { width: '100%', gap: spacing.sm },
  emptyChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#131A23', borderWidth: 1, borderColor: '#1E2835',
    borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
  },
  emptyChipEmoji: { fontSize: 16 },
  emptyChipText:  { color: colors.inkSoft, fontSize: type.small, fontWeight: fontWeight.bold },

  // User bubbles
  userRow:      { alignItems: 'flex-end', gap: 4, alignSelf: 'flex-end', maxWidth: '80%' },
  userBubble:   { backgroundColor: '#1A6B3C', borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  userBubbleText: { color: colors.ink, fontSize: type.body, lineHeight: 22, fontWeight: fontWeight.medium },
  userMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 2 },

  // AI bubbles
  aiRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '88%' },
  aiAvatar:    {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  aiBubbleCol: { flex: 1, gap: 4 },
  aiBubble: {
    backgroundColor: '#131A23', borderRadius: 18, borderTopLeftRadius: 4,
    borderWidth: 1, borderColor: '#1E2835', paddingHorizontal: 14, paddingVertical: 12,
  },
  aiMeta:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 2 },
  copyBtn: { padding: 2 },

  // Shared meta
  metaTime:    { color: '#334155', fontSize: 10, fontWeight: fontWeight.medium },
  readReceipt: { color: colors.emerald, fontSize: 10, fontWeight: fontWeight.black },
  bubbleText:  { color: '#CBD5E1', fontSize: type.body, lineHeight: 23, fontWeight: fontWeight.medium },

  // Metric rows
  metricRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1E2835', marginVertical: 1 },
  metricLabel: { color: '#94A3B8', fontSize: type.body, fontWeight: fontWeight.medium, flex: 1 },
  metricValue: { fontSize: type.body, fontWeight: fontWeight.black, marginLeft: 8 },

  // Chips
  chipsScroll:   { maxHeight: 46, backgroundColor: '#0D1117' },
  chipsContent:  { paddingHorizontal: spacing.md, gap: 8, alignItems: 'center', paddingVertical: 4 },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: '#1E2835', backgroundColor: '#131A23' },
  chipEmoji:     { fontSize: 13 },
  chipLabel:     { color: '#8B98A5', fontSize: 12, fontWeight: fontWeight.bold },

  // Composer
  composerWrap: { backgroundColor: '#0D1117', borderTopWidth: 1, borderTopColor: '#161D27', paddingBottom: spacing.lg, paddingTop: spacing.sm, paddingHorizontal: spacing.md },
  composer:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: '#131A23', borderRadius: 28, borderWidth: 1, borderColor: '#1E2835', paddingHorizontal: 6, paddingVertical: 6 },
  micBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.emerald, alignItems: 'center', justifyContent: 'center', ...shadowLg },
  textInput:    { flex: 1, minHeight: 38, maxHeight: 110, color: colors.ink, fontSize: type.body, fontWeight: fontWeight.medium, paddingHorizontal: 8, paddingVertical: 8 },
  sendBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1E2835', alignItems: 'center', justifyContent: 'center' },
  sendBtnActive: { backgroundColor: colors.emerald },

  // Voice overlay
  voiceScreen:   { flex: 1, backgroundColor: '#060B14' },
  voiceTopBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingTop: spacing.xl, paddingBottom: spacing.lg, position: 'relative' },
  voiceTopTitle: { color: colors.ink, fontSize: type.body, fontWeight: fontWeight.black },
  voiceCancelX:  { position: 'absolute', right: spacing.lg, padding: 8 },
  voiceCenter:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  voiceStatus:   { color: colors.ink, fontSize: 26, fontWeight: fontWeight.black, textAlign: 'center', letterSpacing: -0.5 },
  voiceSubtext:  { color: '#4A5568', fontSize: type.small, textAlign: 'center', marginTop: -spacing.md, paddingHorizontal: spacing.xxl },
  voiceHint:     { color: '#2D3748', fontSize: 11, textAlign: 'center', paddingHorizontal: spacing.xxxl },
  voiceWaveRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, justifyContent: 'center', paddingBottom: spacing.lg },
  voiceWaveLabel: { color: colors.emerald, fontSize: type.small, fontWeight: fontWeight.black, letterSpacing: 0.5 },
  voiceControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xxxl, paddingBottom: spacing.xl },
  voiceCtrlBtn:  { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  voiceMicBtn:   { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.emerald, alignItems: 'center', justifyContent: 'center', shadowColor: colors.emerald, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 12 },
  voiceTapHint:  { color: '#2D3748', fontSize: 11, textAlign: 'center', paddingBottom: spacing.xxl, letterSpacing: 0.3 },

  // Transcript confirmation card
  confirmCard: { backgroundColor: '#131A23', borderRadius: 20, borderWidth: 1, borderColor: '#1E2835', padding: spacing.xl, marginHorizontal: spacing.lg, gap: spacing.lg, ...shadow },
  confirmTitle: { color: '#4A5568', fontSize: type.small, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  confirmTranscript: { color: colors.ink, fontSize: 20, fontWeight: fontWeight.black, lineHeight: 28, letterSpacing: -0.3 },
  confirmHint: { color: '#4A5568', fontSize: type.small },
  confirmActions: { flexDirection: 'row', gap: spacing.md },
  confirmRetry: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#1E2835' },
  confirmRetryText: { color: colors.inkSoft, fontSize: type.small, fontWeight: fontWeight.bold },
  confirmOk: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.emerald },
  confirmOkText: { color: colors.background, fontSize: type.small, fontWeight: fontWeight.black },

  // Orb
  orbWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  orbRing3: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#06B6D4' },
  orbRing2: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#8B5CF6' },
});
