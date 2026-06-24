/**
 * Aurora — AI Companion Screen (redesigned)
 *
 * Architecture:
 *  • state.chatMessages stores every message. Index 0 = system seed (never shown).
 *  • Assistant messages that carry a rich card encode a JSON block as the first
 *    line of content: <<CARD:{...}>>  followed by a newline and the text reply.
 *    CompanionScreen parses this at render time; nothing extra is persisted.
 *  • applyAgentActions updates LOCAL state only (server already wrote to Supabase).
 *  • buildRichPayload() decides which card type to attach based on intent + actions.
 */

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
import {
  Brain, CheckCircle, ChevronLeft, Copy, Keyboard,
  Mic, RefreshCw, Send, Sparkles, Square, TrendingUp,
  Volume2, X, Droplets, Moon, Target, Apple,
} from 'lucide-react-native';
import Svg, {
  Circle, Defs, RadialGradient, Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';

import { useNavigation, useRoute } from '@react-navigation/native';
import { pingServer, sendAgentText, sendAgentVoice } from '../services/agentApi';
import { supabase } from '../lib/supabase';
import { useHealth } from '../store/HealthContext';
import { AgentAction, RichCardType, RichMessagePayload } from '../types/health';
import { AuroraLaunchParams } from '../types/navigation';
import { colors, fontWeight, radius, shadow, spacing, type } from '../theme/tokens';
import {
  HealthSummaryCard, HydrationCard, SleepCard,
  HabitProgressCard, NutritionCard, InsightCard, WeeklyReportCard,
} from '../components/HealthCards';

const useND = Platform.OS !== 'web';

// ─── UI states ────────────────────────────────────────────────────
type UIStatus = 'idle' | 'listening' | 'processing' | 'confirming' | 'speaking';

// ─── Card marker helpers ──────────────────────────────────────────
const CARD_PREFIX = '<<CARD:';
const CARD_SUFFIX = '>>';

function encodeCard(payload: RichMessagePayload): string {
  return `${CARD_PREFIX}${JSON.stringify(payload)}${CARD_SUFFIX}\n${payload.text}`;
}

function decodeCard(content: string): { payload: RichMessagePayload; text: string } | null {
  if (!content.startsWith(CARD_PREFIX)) return null;
  try {
    // Search for CARD_SUFFIX only after the prefix so we don't match ">>"
    // that might appear inside a JSON string value.
    const searchFrom = CARD_PREFIX.length;
    const end = content.indexOf(CARD_SUFFIX, searchFrom);
    if (end === -1) return null;
    const json    = content.slice(CARD_PREFIX.length, end);
    const payload = JSON.parse(json) as RichMessagePayload;
    const text    = content.slice(end + CARD_SUFFIX.length + 1); // skip \n
    return { payload, text };
  } catch {
    return null;
  }
}

// ─── Build rich payload from agent result ────────────────────────
function buildRichPayload(
  intent: string | undefined,
  actions: AgentAction[],
  reply: string,
  state: ReturnType<typeof useHealth>['state'],
): RichMessagePayload | null {
  // Always use REAL data from state — never hardcode health values

  if (intent === 'log_water' || actions.some(a => a.type === 'ADD_WATER')) {
    const waterAction = actions.find((a): a is Extract<AgentAction, { type: 'ADD_WATER' }> => a.type === 'ADD_WATER');
    return {
      cardType: 'hydration_update',
      cardData: {
        currentMl:   state.hydration.currentMl,
        goalMl:      state.hydration.goalMl,
        addedMl:     waterAction?.amountMl,
      },
      text: reply,
    };
  }

  if (intent === 'log_sleep' || actions.some(a => a.type === 'LOG_SLEEP')) {
    const sleepAction = actions.find((a): a is Extract<AgentAction, { type: 'LOG_SLEEP' }> => a.type === 'LOG_SLEEP');
    const lastLog = state.sleep.logs[0];
    return {
      cardType: 'sleep_update',
      cardData: {
        hours:       sleepAction?.hours ?? state.sleep.lastHours,
        bedtime:     sleepAction?.bedtime ?? lastLog?.bedtime,
        wakeTime:    sleepAction?.wakeTime ?? lastLog?.wakeTime,
        quality:     lastLog?.quality,
        weeklyAvg:   state.sleep.weeklyAverage,
      },
      text: reply,
    };
  }

  if (intent === 'create_habit' || actions.some(a => a.type === 'CREATE_HABIT')) {
    const habitAction = actions.find((a): a is Extract<AgentAction, { type: 'CREATE_HABIT' }> => a.type === 'CREATE_HABIT');
    return {
      cardType: 'habit_progress',
      cardData: {
        habits:     state.habits.filter(h => !h.paused),
        newHabit:   habitAction?.title,
      },
      text: reply,
    };
  }

  if (intent === 'complete_habit' || actions.some(a => a.type === 'COMPLETE_HABIT')) {
    return {
      cardType: 'habit_progress',
      cardData: {
        habits: state.habits.filter(h => !h.paused),
      },
      text: reply,
    };
  }

  if (intent === 'log_meal' || actions.some(a => a.type === 'ADD_MEAL')) {
    const mealAction = actions.find((a): a is Extract<AgentAction, { type: 'ADD_MEAL' }> => a.type === 'ADD_MEAL');
    const today = new Date().toISOString().slice(0, 10);
    const todayMeals = state.meals.filter(m => m.date === today);
    const totalCals = todayMeals.reduce((s, m) => s + m.calories, 0);
    const totalProt = todayMeals.reduce((s, m) => s + m.protein, 0);
    const totalCarb = todayMeals.reduce((s, m) => s + m.carbs, 0);
    const totalFat  = todayMeals.reduce((s, m) => s + m.fat, 0);
    return {
      cardType: 'nutrition_log',
      cardData: {
        calories:  totalCals,
        protein:   totalProt,
        carbs:     totalCarb,
        fat:       totalFat,
        mealName:  mealAction?.name,
        mealType:  mealAction?.mealType,
      },
      text: reply,
    };
  }

  if (intent === 'get_health_summary' || intent === 'get_hydration_status' ||
      intent === 'get_sleep_status'   || intent === 'get_habit_status'     ||
      intent === 'get_nutrition_status') {
    const today      = new Date().toISOString().slice(0, 10);
    const active     = state.habits.filter(h => !h.paused);
    const done       = active.filter(h => h.completedToday).length;
    const hydrPct    = state.hydration.goalMl > 0
      ? Math.round((state.hydration.currentMl / state.hydration.goalMl) * 100)
      : 0;
    const todayMeals = state.meals.filter(m => m.date === today);
    const cals       = todayMeals.reduce((s, m) => s + m.calories, 0);
    const topStreak  = Math.max(0, ...state.habits.map(h => h.streak));
    const consistPct = state.sleep.consistency;

    // Pick focused area dynamically from real data
    const focusArea = hydrPct < 60 ? 'Hydration'
                    : state.sleep.lastHours < 6.5 ? 'Sleep'
                    : done < active.length * 0.6   ? 'Habits'
                    : cals < 1200                   ? 'Nutrition'
                    : undefined;

    return {
      cardType: 'health_summary',
      cardData: {
        hydrationPct:    hydrPct,
        hydrationMl:     state.hydration.currentMl,
        hydrationGoalMl: state.hydration.goalMl,
        sleepHours:      state.sleep.lastHours,
        sleepGoalHours:  8,
        habitsCompleted: done,
        habitsTotal:     active.length,
        consistencyPct:  consistPct,
        streaks:         topStreak,
        focusArea,
      },
      text: reply,
    };
  }

  if (intent === 'get_weekly_report') {
    const topStreak     = Math.max(0, ...state.habits.map(h => h.streak));
    const topHabit      = state.habits.reduce((a, b) => b.streak > a.streak ? b : a, state.habits[0]);
    const active        = state.habits.filter(h => !h.paused);
    const done          = active.filter(h => h.completedToday).length;
    return {
      cardType: 'weekly_report',
      cardData: {
        hydrationAvgMl:      state.hydration.currentMl,
        hydrationGoalMl:     state.hydration.goalMl,
        sleepAvgHours:       state.sleep.weeklyAverage,
        habitsCompletionPct: active.length > 0 ? Math.round((done / active.length) * 100) : 0,
        topStreak,
        topStreakName:       topHabit?.title,
        period:              'This Week',
      },
      text: reply,
    };
  }

  if (intent === 'general_health_advice' || intent === 'off_topic') {
    // Show insight card for advice responses
    return {
      cardType: 'insight',
      cardData: {
        insight:  reply,
        category: 'general' as const,
      },
      text: '',
    };
  }

  return null; // plain text for unknown intents
}

// ─── Quick action chips ───────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'summary',  icon: TrendingUp,  label: 'How am I doing?', text: 'How am I doing this week?' },
  { id: 'water',    icon: Droplets,    label: 'Log water',       text: 'I drank 500ml of water' },
  { id: 'sleep',    icon: Moon,        label: 'Log sleep',       text: 'I slept 7 hours last night' },
  { id: 'habit',    icon: Target,      label: 'My habits',       text: 'Show me my habit progress today' },
  { id: 'meal',     icon: Apple,       label: 'Log meal',        text: 'I had a healthy lunch' },
  { id: 'insight',  icon: Brain,       label: 'Health insight',  text: 'Give me a health insight based on my patterns' },
  { id: 'weekly',   icon: TrendingUp,  label: 'Weekly report',   text: 'Show me my weekly health report' },
] as const;

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch { return ''; }
}

// ─── Rich card router ─────────────────────────────────────────────
function RichCard({ payload, state }: {
  payload: RichMessagePayload;
  state: ReturnType<typeof useHealth>['state'];
}) {
  const { cardType, cardData } = payload;

  if (cardType === 'health_summary')  return <HealthSummaryCard data={cardData as Parameters<typeof HealthSummaryCard>[0]['data']} />;
  if (cardType === 'hydration_update') return <HydrationCard    data={cardData as Parameters<typeof HydrationCard>[0]['data']} />;
  if (cardType === 'sleep_update')    return <SleepCard         data={cardData as Parameters<typeof SleepCard>[0]['data']} />;
  if (cardType === 'habit_progress')  return <HabitProgressCard data={{ ...cardData, habits: cardData.habits ?? state.habits.filter(h => !h.paused) } as Parameters<typeof HabitProgressCard>[0]['data']} />;
  if (cardType === 'nutrition_log')   return <NutritionCard     data={cardData as Parameters<typeof NutritionCard>[0]['data']} />;
  if (cardType === 'weekly_report')   return <WeeklyReportCard  data={cardData as Parameters<typeof WeeklyReportCard>[0]['data']} />;
  if (cardType === 'insight')         return <InsightCard       data={cardData as Parameters<typeof InsightCard>[0]['data']} />;
  return null;
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
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: colors.inkSoft, opacity: v,
    transform: [{ scale: v.interpolate({ inputRange: [0.25, 1], outputRange: [0.7, 1.1] }) }],
  });
  return (
    <View style={{ flexDirection: 'row', gap: 5, padding: spacing.sm }}>
      <Animated.View style={dot(d1)} />
      <Animated.View style={dot(d2)} />
      <Animated.View style={dot(d3)} />
    </View>
  );
}

// ─── Waveform ─────────────────────────────────────────────────────
function WaveformBars({ active, count = 7 }: { active: boolean; count?: number }) {
  const bars  = useRef(Array.from({ length: count }, () => new Animated.Value(0.15))).current;
  const PEAKS = [0.4, 0.7, 0.95, 1.0, 0.9, 0.65, 0.35];
  const SPD   = [380, 280, 320, 260, 340, 300, 420];
  useEffect(() => {
    if (!active) { bars.forEach(b => b.setValue(0.15)); return; }
    const loops = bars.map((b, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 60),
        Animated.timing(b, { toValue: PEAKS[i % PEAKS.length], duration: SPD[i % SPD.length], easing: Easing.inOut(Easing.ease), useNativeDriver: useND }),
        Animated.timing(b, { toValue: 0.12, duration: SPD[i % SPD.length] * 0.75, easing: Easing.inOut(Easing.ease), useNativeDriver: useND }),
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
  // Unique gradient IDs per instance — Android react-native-svg uses a global
  // gradient registry; duplicate IDs across SVG instances cause wrong renders.
  const orbId  = useRef(`orb_${Math.random().toString(36).slice(2, 9)}`).current;
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
        <Svg width={200} height={200} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id={`${orbId}_body`} cx="45%" cy="35%" r="65%">
              <Stop offset="0%"   stopColor="#22D3EE" stopOpacity="0.95" />
              <Stop offset="30%"  stopColor="#8B5CF6" stopOpacity="0.8" />
              <Stop offset="65%"  stopColor="#1E1040" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#060B14" stopOpacity="1" />
            </RadialGradient>
            <RadialGradient id={`${orbId}_ambient`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor="#06B6D4" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#060B14" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={100} cy={100} r={95}  fill={`url(#${orbId}_ambient)`} />
          <Circle cx={100} cy={100} r={76}  fill={`url(#${orbId}_body)`} />
          <Circle cx={100} cy={100} r={76}  fill="none" stroke="#06B6D4" strokeWidth={1} strokeOpacity={0.3} />
          <Circle cx={82}  cy={78}  r={18}  fill="#06B6D4" opacity={0.15} />
          <Circle cx={78}  cy={74}  r={9}   fill="#FFFFFF"  opacity={0.07} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Voice overlay ────────────────────────────────────────────────
function VoiceOverlay({
  uiStatus, pendingTranscript,
  onStop, onCancel, onKeyboard, onConfirm, onRetry,
}: {
  uiStatus: UIStatus; pendingTranscript: string;
  onStop: () => void; onCancel: () => void;
  onKeyboard: () => void; onConfirm: () => void; onRetry: () => void;
}) {
  const isListening  = uiStatus === 'listening';
  const isProcessing = uiStatus === 'processing';
  const isConfirming = uiStatus === 'confirming';

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

  return (
    <View style={cs.voiceScreen}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={cs.voiceTopBar}>
          <Sparkles size={15} color={colors.emerald} strokeWidth={2} />
          <Text style={cs.voiceTopTitle}>Aurora</Text>
          <TouchableOpacity onPress={onCancel} style={cs.voiceCancelX}>
            <X size={18} color={colors.inkSoft} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={cs.voiceCenter}
          onPress={isListening ? onStop : undefined}
          activeOpacity={isListening ? 0.8 : 1}
        >
          <VoiceOrb active={isListening} />
          <Text style={cs.voiceStatus}>
            {isListening   ? "I'm listening..."
            : isProcessing ? 'Processing...'
            : 'Starting...'}
          </Text>
          <Text style={cs.voiceSubtext}>
            {isListening   ? 'Tap ■ when done, or wait 8s'
            : isProcessing ? 'Just a moment...'
            : 'Opening microphone...'}
          </Text>
        </TouchableOpacity>

        <View style={cs.voiceWaveRow}>
          <WaveformBars active={isListening} count={7} />
        </View>

        <View style={cs.voiceControls}>
          <TouchableOpacity style={cs.voiceCtrlBtn} onPress={onCancel}>
            <X size={22} color={colors.ink} strokeWidth={2} />
          </TouchableOpacity>

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

        {isListening && (
          <Text style={cs.voiceTapHint}>Speak now • Tap ■ to send early</Text>
        )}
      </SafeAreaView>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────
function EmptyState({ name, onChip, busy }: {
  name: string; onChip: (text: string) => void; busy: boolean;
}) {
  return (
    <View style={cs.emptyState}>
      <View style={cs.emptyOrbWrap}>
        <Svg width={96} height={96} viewBox="0 0 96 96">
          <Defs>
            <RadialGradient id="eg" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor="#06B6D4" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#0D1117" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={48} cy={48} r={44} fill="url(#eg)" />
          <Circle cx={48} cy={48} r={30} fill="#151B23" stroke="#1E2835" strokeWidth={1.5} />
          <Circle cx={48} cy={48} r={20} fill="none"    stroke="#22C55E" strokeWidth={1.5} strokeOpacity={0.5} />
        </Svg>
        <View style={cs.emptyOrbIcon}>
          <Sparkles size={20} color={colors.emerald} strokeWidth={2} />
        </View>
      </View>

      <Text style={cs.emptyTitle}>Hi {name || 'there'} 👋</Text>
      <Text style={cs.emptySubtitle}>
        I'm Aurora, your personal health companion.{'\n'}
        Ask me anything or tap a suggestion below.
      </Text>

      <View style={cs.emptyChips}>
        {QUICK_ACTIONS.slice(0, 4).map(action => {
          const Icon = action.icon;
          return (
            <TouchableOpacity
              key={action.id}
              style={cs.emptyChip}
              onPress={() => onChip(action.text)}
              disabled={busy}
              activeOpacity={0.7}
            >
              <Icon size={14} color={colors.emerald} strokeWidth={2.5} />
              <Text style={cs.emptyChipText}>{action.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────
export function CompanionScreen() {
  const { state, addChatMessage, applyAgentActions } = useHealth();
  const navigation   = useNavigation<any>();
  const route        = useRoute<any>();
  const launchParams = (route.params ?? {}) as AuroraLaunchParams;

  const [input,             setInput]             = useState('');
  const [busy,              setBusy]              = useState(false);
  const [uiStatus,          setUiStatus]          = useState<UIStatus>('idle');
  const [voiceMode,         setVoiceMode]         = useState(false);
  const [isSpeaking,        setIsSpeaking]        = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [pendingTranscript, setPendingTranscript] = useState('');
  const [serverReady,       setServerReady]       = useState<boolean | null>(null);

  const scrollRef        = useRef<ScrollView>(null);
  const handledLaunchRef = useRef<string | undefined>(undefined);
  const pendingResultRef = useRef<{ reply: string; actions: AgentAction[]; intent?: string } | null>(null);
  const pipelineRef      = useRef<((uri: string | null) => Promise<void>) | null>(null);

  const onAutoStop = useCallback((uri: string | null) => {
    setUiStatus('processing');
    setBusy(true);
    pipelineRef.current?.(uri);
  }, []);

  const {
    isRecording,
    requestPermission,
    startRecording: recorderStart,
    stopRecording: recorderStop,
  } = useVoiceRecorder(onAutoStop);

  useEffect(() => {
    requestPermission().then(ok => setPermissionGranted(ok)).catch(() => setPermissionGranted(false));
    pingServer().then(ok => setServerReady(ok)).catch(() => setServerReady(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [state.chatMessages.length, busy]);

  // ── TTS ─────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    Speech.stop();
    if (!text.trim()) return;
    setIsSpeaking(true);
    setUiStatus('speaking');
    // Speak the full text as a single utterance — Android TTS engines have
    // unreliable onDone callbacks when chaining multiple Speech.speak() calls,
    // causing playback to stop after the first sentence. One call is reliable.
    Speech.speak(text, {
      rate: 0.88, pitch: 1.06, language: 'en-US',
      onDone:    () => { setIsSpeaking(false); setUiStatus('idle'); },
      onError:   () => { setIsSpeaking(false); setUiStatus('idle'); },
      onStopped: () => { setIsSpeaking(false); setUiStatus('idle'); },
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    Speech.stop(); setIsSpeaking(false); setUiStatus('idle');
  }, []);

  // ── Sync to Supabase ─────────────────────────────────────────────
  const syncMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      supabase.from('chat_messages').insert({ user_id: user.id, role, content }).then(() => undefined);
    } catch { /* non-critical */ }
  }, []);

  // ── Compose and add an AI message (with optional rich card) ─────
  const addAiMessage = useCallback((
    reply: string,
    actions: AgentAction[],
    intent: string | undefined,
  ) => {
    const richPayload = buildRichPayload(intent, actions, reply, state);
    const content = richPayload ? encodeCard(richPayload) : reply;
    addChatMessage({ role: 'assistant', content });
    syncMessage('assistant', content);
  }, [state, addChatMessage, syncMessage]);

  // ── Apply result ─────────────────────────────────────────────────
  const applyResult = useCallback((
    reply: string,
    actions: AgentAction[] = [],
    intent?: string,
  ) => {
    applyAgentActions(actions);
    addAiMessage(reply, actions, intent);
    setServerReady(true);
    setBusy(false);
    // Only speak the text portion, not the card JSON
    const textToSpeak = reply.trim();
    if (textToSpeak) {
      speak(textToSpeak);
    } else {
      // Nothing to speak — reset uiStatus so the "Thinking" pill disappears
      setUiStatus('idle');
    }
  }, [applyAgentActions, addAiMessage, speak]);

  // ── Send text ────────────────────────────────────────────────────
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
      const errMsg  = err instanceof Error ? err.message : '';
      const timeout = errMsg.includes('timed out') || errMsg.includes('waking up');
      const fallback = timeout
        ? 'The server is waking up from sleep — give it 30 seconds and try again.'
        : "I couldn't reach the server. Check your connection and try again.";
      addChatMessage({ role: 'assistant', content: fallback });
      syncMessage('assistant', fallback);
      speak(fallback);
      setBusy(false);
      setUiStatus('idle');
      setServerReady(false);
    }
  }, [input, busy, state, addChatMessage, syncMessage, applyResult, speak]);

  // ── Start recording ──────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (busy || isRecording) return;
    if (isSpeaking) stopSpeaking();
    let hasPerm = permissionGranted;
    if (!hasPerm) {
      hasPerm = await requestPermission();
      setPermissionGranted(hasPerm);
    }
    if (!hasPerm) {
      Alert.alert('Microphone needed', 'Enable microphone access in Settings to use voice.');
      return;
    }
    setVoiceMode(true);
    setUiStatus('idle');
    const ok = await recorderStart();
    if (ok) { setUiStatus('listening'); }
    else    { setVoiceMode(false); setUiStatus('idle'); Alert.alert('Could not start recording', 'Check microphone permissions and try again.'); }
  }, [busy, isRecording, isSpeaking, stopSpeaking, permissionGranted, requestPermission, recorderStart]);

  // ── Voice pipeline ───────────────────────────────────────────────
  const runVoicePipeline = useCallback(async (uri: string | null) => {
    const done = (opts?: { keepBusy?: boolean }) => {
      setVoiceMode(false);
      setUiStatus('idle');
      if (!opts?.keepBusy) setBusy(false);
    };

    if (!uri) { done(); return; }

    try {
      const res = await sendAgentVoice(uri, state);

      if (res.error === 'no_audio' || res.error === 'no_transcript') {
        done();
        addChatMessage({ role: 'assistant', content: "I didn't catch that. Try speaking closer to the microphone, or type your message." });
        return;
      }
      if (res.error === 'unclear' || res.error === 'low_confidence') {
        done();
        addChatMessage({ role: 'assistant', content: "I heard you, but wasn't sure what you meant. Could you rephrase?" });
        return;
      }

      if (res.needsConfirmation && res.transcript) {
        setPendingTranscript(res.transcript);
        pendingResultRef.current = {
          reply:   res.reply   ?? '',
          actions: res.actions ?? [],
          intent:  res.intent,
        };
        // voiceMode is already true — keep overlay open, switch to confirm state
        setUiStatus('confirming');
        setBusy(false);
        return;
      }

      // Success — close overlay FIRST, then add messages
      done({ keepBusy: true });
      if (res.transcript) {
        addChatMessage({ role: 'user', content: res.transcript });
        syncMessage('user', res.transcript);
      }
      if (res.reply) {
        applyResult(res.reply, res.actions ?? [], res.intent);
      } else {
        setBusy(false);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      done();
      const timeout = errMsg.includes('timed out') || errMsg.includes('waking up');
      const fallback = timeout
        ? 'The server is waking up. Wait a moment and try again.'
        : "Couldn't reach the server. Check your connection.";
      addChatMessage({ role: 'assistant', content: fallback });
      syncMessage('assistant', fallback);
      speak(fallback);
      setServerReady(false);
    }
  }, [state, addChatMessage, syncMessage, applyResult, speak]);

  useEffect(() => { pipelineRef.current = runVoicePipeline; }, [runVoicePipeline]);

  // ── Manual stop ──────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (!isRecording) return;
    setUiStatus('processing');
    setBusy(true);
    const uri = await recorderStop();
    if (uri) {
      await runVoicePipeline(uri);
    } else {
      setVoiceMode(false);
      setBusy(false);
      setUiStatus('idle');
    }
  }, [isRecording, recorderStop, runVoicePipeline]);

  // ── Confirm transcript ───────────────────────────────────────────
  const confirmTranscript = useCallback(() => {
    const pending = pendingResultRef.current;
    setPendingTranscript('');
    pendingResultRef.current = null;
    setVoiceMode(false);
    setBusy(true);
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
  }, [pendingTranscript, addChatMessage, syncMessage, applyResult]);

  // ── Retry ────────────────────────────────────────────────────────
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

  // ── Cancel ───────────────────────────────────────────────────────
  const cancelVoice = useCallback(async () => {
    try { if (isRecording) await recorderStop(); } catch { /* ignore */ }
    setPendingTranscript('');
    pendingResultRef.current = null;
    setVoiceMode(false);
    setUiStatus('idle');
    setBusy(false);
  }, [isRecording, recorderStop]);

  // ── Auto-start from HomeScreen "Talk to Aurora" ──────────────────
  useEffect(() => {
    const launchId = launchParams.launchId;
    if (!launchParams.autoStartVoice || !launchId || handledLaunchRef.current === launchId) return;
    if (busy || isRecording || uiStatus === 'processing') return;
    handledLaunchRef.current = launchId;
    const t = setTimeout(() => startRecording().catch(() => setUiStatus('idle')), 300);
    return () => clearTimeout(t);
  }, [busy, isRecording, launchParams, uiStatus, startRecording]);

  // ─────────────────────────────────────────────────────────────────
  const messages    = state.chatMessages.slice(1);
  const hasMessages = messages.length > 0;
  const isWorking   = uiStatus === 'processing';

  return (
    <SafeAreaView style={cs.screen}>
      {/* Voice overlay modal — transparent={true} so SafeAreaView inside
          receives correct insets on Android (with transparent={false} the
          statusBarTranslucent prop is silently ignored and content shifts
          under the status bar on many Android devices). */}
      <Modal visible={voiceMode} animationType="fade" transparent={true} statusBarTranslucent>
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

      {/* Offline banner */}
      {serverReady === false && (
        <View style={cs.offlineBanner}>
          <Text style={cs.offlineBannerText}>⚠ Server waking up — first message may take 30s</Text>
        </View>
      )}

      {/* Header */}
      <View style={cs.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={cs.iconBtn}>
          <ChevronLeft size={20} color={colors.ink} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={cs.headerCenter}>
          <View style={cs.headerTitleRow}>
            <View style={cs.auroraIndicator} />
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
          <Text style={cs.headerSubtitle}>AI Health Companion</Text>
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
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={cs.messageScroll}
          contentContainerStyle={[cs.messages, !hasMessages && cs.messagesCenter]}
        >
          {!hasMessages && (
            <EmptyState
              name={state.user.name}
              onChip={sendText}
              busy={busy}
            />
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

            // AI message — try to decode a rich card
            const decoded = decodeCard(msg.content);

            return (
              <View key={msg.id} style={cs.aiRow}>
                {/* Avatar */}
                <View style={cs.aiAvatarCol}>
                  <View style={cs.aiAvatar}>
                    <Sparkles size={13} color={colors.background} strokeWidth={2.5} />
                  </View>
                </View>

                {/* Content */}
                <View style={cs.aiBubbleCol}>
                  {decoded ? (
                    <>
                      {/* Rich card */}
                      <RichCard payload={decoded.payload} state={state} />
                      {/* Natural language reply below the card */}
                      {decoded.text.trim().length > 0 && (
                        <View style={cs.aiTextBubble}>
                          <Text style={cs.bubbleText}>{decoded.text}</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={cs.aiTextBubble}>
                      <Text style={cs.bubbleText}>{msg.content}</Text>
                    </View>
                  )}

                  <View style={cs.aiMeta}>
                    <Text style={cs.metaTime}>{time}</Text>
                    <TouchableOpacity
                      style={cs.copyBtn}
                      onPress={() => {/* clipboard */}}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Copy size={11} color={colors.muted} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Typing indicator */}
          {isWorking && (
            <View style={cs.aiRow}>
              <View style={cs.aiAvatarCol}>
                <View style={cs.aiAvatar}>
                  <Sparkles size={13} color={colors.background} strokeWidth={2.5} />
                </View>
              </View>
              <View style={cs.aiBubbleCol}>
                <View style={cs.aiTextBubble}>
                  <TypingDots />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick action chips — shown only when no messages */}
        {!hasMessages && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={cs.chipsScroll}
            contentContainerStyle={cs.chipsContent}
          >
            {QUICK_ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={cs.chip}
                  onPress={() => sendText(action.text)}
                  disabled={busy}
                  activeOpacity={0.7}
                >
                  <Icon size={12} color={colors.emerald} strokeWidth={2.5} />
                  <Text style={cs.chipLabel}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Composer */}
        <View style={cs.composerWrap}>
          <View style={cs.composer}>
            <TextInput
              style={cs.textInput}
              placeholder="Message Aurora..."
              placeholderTextColor={colors.muted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendText()}
              returnKeyType="send"
              multiline
              maxLength={500}
              editable={!busy}
            />

            {/* Mic button — only allow stop when actually recording, not in
                confirming/speaking states where voiceMode=true but mic is idle */}
            <TouchableOpacity
              style={[cs.composerBtn, isRecording && cs.composerBtnActive]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={busy && !isRecording}
              activeOpacity={0.75}
            >
              <Mic size={18} color={isRecording ? colors.emerald : colors.inkSoft} strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Send button */}
            <TouchableOpacity
              style={[cs.sendBtn, input.trim().length > 0 && cs.sendBtnActive]}
              onPress={() => sendText()}
              disabled={!input.trim() || busy}
              activeOpacity={0.75}
            >
              <Send size={16} color={input.trim() ? colors.background : colors.muted} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const cs = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Banners ────────────────────────────────────────────────────
  offlineBanner: {
    backgroundColor: '#7C2D12',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  offlineBannerText: {
    fontSize: type.micro,
    color: '#FED7AA',
    fontWeight: fontWeight.medium,
  },

  // ── Header ─────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    borderColor: colors.emerald + '66',
    backgroundColor: colors.emeraldSoft,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  auroraIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.emerald,
  },
  headerTitle: {
    fontSize: type.body,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: type.micro,
    color: colors.muted,
    fontWeight: fontWeight.medium,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.emeraldSoft,
    borderWidth: 1,
    borderColor: colors.emeraldGlow,
  },
  statusText: {
    fontSize: 10,
    color: colors.emerald,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.4,
  },

  // ── Messages ───────────────────────────────────────────────────
  messageScroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messages: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  messagesCenter: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // ── Empty state ────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  emptyOrbWrap: {
    position: 'relative',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOrbIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: type.section,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: type.small,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  emptyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyChipText: {
    fontSize: type.small,
    color: colors.inkSoft,
    fontWeight: fontWeight.medium,
  },

  // ── User message ───────────────────────────────────────────────
  userRow: {
    alignItems: 'flex-end',
    gap: 4,
  },
  userBubble: {
    backgroundColor: '#1A3A2A',
    borderRadius: radius.xl,
    borderBottomRightRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.emerald + '33',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '80%',
  },
  userBubbleText: {
    fontSize: type.small,
    color: colors.ink,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },

  // ── AI message ─────────────────────────────────────────────────
  aiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  aiAvatarCol: {
    paddingTop: 3,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  aiBubbleCol: {
    flex: 1,
    gap: spacing.xs,
  },
  aiTextBubble: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderTopLeftRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '100%',
  },
  aiMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
  bubbleText: {
    fontSize: type.small,
    color: colors.inkSoft,
    lineHeight: 20,
  },
  metaTime: {
    fontSize: type.micro,
    color: colors.subtle,
    fontWeight: fontWeight.medium,
  },
  readReceipt: {
    fontSize: type.micro,
    color: colors.emerald,
    fontWeight: fontWeight.medium,
  },
  copyBtn: {
    padding: 3,
  },

  // ── Chips ──────────────────────────────────────────────────────
  chipsScroll: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    maxHeight: 52,
  },
  chipsContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipLabel: {
    fontSize: type.micro,
    color: colors.inkSoft,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.2,
  },

  // ── Composer ───────────────────────────────────────────────────
  composerWrap: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: type.small,
    color: colors.ink,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 2,
    lineHeight: 20,
  },
  composerBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerBtnActive: {
    backgroundColor: colors.emeraldSoft,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  sendBtnActive: {
    backgroundColor: colors.emerald,
  },

  // ── Voice overlay ──────────────────────────────────────────────
  voiceScreen: {
    flex: 1,
    backgroundColor: '#060B14',
    // On Android with transparent Modal, we must fill the full screen
    // including the area behind the status bar
    ...Platform.select({ android: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 } }),
  },
  voiceTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  voiceTopTitle: {
    fontSize: type.body,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  voiceCancelX: {
    position: 'absolute',
    right: spacing.xxl,
    top: spacing.lg,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  voiceStatus: {
    fontSize: type.section,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    letterSpacing: 0.3,
  },
  voiceSubtext: {
    fontSize: type.small,
    color: colors.inkSoft,
  },
  voiceWaveRow: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  voiceControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  voiceCtrlBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceMicBtn: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  voiceTapHint: {
    textAlign: 'center',
    fontSize: type.micro,
    color: colors.muted,
    paddingBottom: spacing.md,
  },

  // ── Confirmation card ──────────────────────────────────────────
  confirmCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.md,
    marginHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: type.small,
    color: colors.muted,
    fontWeight: fontWeight.medium,
  },
  confirmTranscript: {
    fontSize: type.body,
    color: colors.ink,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    lineHeight: 24,
  },
  confirmHint: {
    fontSize: type.small,
    color: colors.inkSoft,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  confirmRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmRetryText: {
    fontSize: type.small,
    color: colors.inkSoft,
    fontWeight: fontWeight.medium,
  },
  confirmOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.emerald,
  },
  confirmOkText: {
    fontSize: type.small,
    color: colors.background,
    fontWeight: fontWeight.bold,
  },

  // ── Voice orb ──────────────────────────────────────────────────
  orbWrap: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbRing2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: '#06B6D4',
  },
  orbRing3: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
});
