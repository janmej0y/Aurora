import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BedDouble, ChevronLeft, Info, Moon, Plus, X } from 'lucide-react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { MiniBarChart, ScoreRing, SleepStagesBar } from '../components/visuals';
import { useHealth } from '../store/HealthContext';
import { colors, fontWeight, radius, shadow, spacing, type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

function SleepDurationRing({ hours, targetHours = 8 }: { hours: number; targetHours?: number }) {
  const size = 200;
  const sw = 16;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, hours / targetHours);
  const offset = circ * (1 - pct);
  const center = size / 2;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const scoreColor = hours >= 7.5 ? colors.emerald : hours >= 6 ? colors.blue : colors.amber;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={center} cy={center} r={r} fill="none" stroke={colors.track} strokeWidth={sw} />
        <Circle
          cx={center} cy={center} r={r} fill="none"
          stroke={scoreColor} strokeWidth={sw}
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={[sleepStyles.durationMain, { color: scoreColor }]}>
          {h}h {m}m
        </Text>
        <Text style={sleepStyles.durationSub}>Sleep Duration</Text>
        <View style={[sleepStyles.qualityBadge, { backgroundColor: `${scoreColor}20` }]}>
          <Text style={[sleepStyles.qualityText, { color: scoreColor }]}>
            {hours >= 7.5 ? 'Excellent' : hours >= 6.5 ? 'Good' : hours >= 5.5 ? 'Fair' : 'Poor'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function SleepScreen() {
  const { state, logSleep } = useHealth();
  const navigation = useNavigation<any>();
  const tc = useTheme();
  const [showLogModal, setShowLogModal] = useState(false);
  const [hoursInput, setHoursInput] = useState(String(state.sleep.lastHours));
  const [bedtimeInput, setBedtimeInput] = useState(state.user.bedtime);
  const [wakeInput, setWakeInput] = useState(state.user.wakeTime);

  const logs = state.sleep.logs.slice(0, 7).reverse();
  const labels = logs.map((l) => new Date(`${l.date}T00:00:00`).toLocaleDateString('en', { weekday: 'short' }).slice(0, 1));
  const lastLog = state.sleep.logs[0];
  const stages = lastLog?.stages ?? { rem: 1.6, light: 4.0, deep: 1.7, awake: 0.4 };
  const totalStageHours = stages.rem + stages.light + stages.deep + stages.awake;

  const stageData = [
    { label: 'REM', hours: stages.rem, color: colors.lilac },
    { label: 'Light', hours: stages.light, color: colors.blue },
    { label: 'Deep', hours: stages.deep, color: colors.emerald },
    { label: 'Awake', hours: stages.awake, color: colors.amber },
  ];

  const handleLog = () => {
    const h = Number(hoursInput);
    if (h > 0 && h <= 16) {
      logSleep(h, bedtimeInput, wakeInput);
      setShowLogModal(false);
    }
  };

  const bedtimeStability = (() => {
    const recentBeds = state.sleep.logs.slice(0, 7).map((l) => {
      const [hh, mm] = l.bedtime.split(':').map(Number);
      return hh * 60 + mm;
    });
    if (recentBeds.length < 2) return 85;
    const avg = recentBeds.reduce((s, v) => s + v, 0) / recentBeds.length;
    const variance = recentBeds.reduce((s, v) => s + Math.abs(v - avg), 0) / recentBeds.length;
    return Math.max(40, Math.min(98, Math.round(100 - variance * 2)));
  })();

  const insightText = state.sleep.lastHours < 7
    ? `You slept ${state.sleep.lastHours}h last night — below your ${state.sleep.weeklyAverage}h average. The highest-impact fix is a consistent 20-min wind-down routine before ${state.user.bedtime}.`
    : `Your sleep last night was solid at ${state.sleep.lastHours}h. Sleep consistency at ${state.sleep.consistency}% — keep your bedtime window stable to protect your score.`;

  return (
    <SafeAreaView style={[sleepStyles.screen, { backgroundColor: tc.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sleepStyles.scroll}>
        {/* Header */}
        <View style={sleepStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[sleepStyles.backBtn, { backgroundColor: tc.surface, borderColor: tc.border }]} accessibilityLabel="Back">
            <ChevronLeft size={20} color={colors.ink} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={sleepStyles.headerTitle}>Sleep</Text>
          <TouchableOpacity
            onPress={() => setShowLogModal(true)}
            style={[sleepStyles.logBtn, { backgroundColor: tc.surface, borderColor: tc.border }]}
            accessibilityLabel="Log sleep"
          >
            <Plus size={16} color={colors.lilac} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Date switcher */}
        <View style={sleepStyles.dateSwitcher}>
          <TouchableOpacity><Text style={sleepStyles.dateSwitcherArrow}>‹</Text></TouchableOpacity>
          <Text style={sleepStyles.dateSwitcherText}>Today</Text>
          <TouchableOpacity><Text style={sleepStyles.dateSwitcherArrow}>›</Text></TouchableOpacity>
        </View>

        {/* Duration ring */}
        <View style={[sleepStyles.durationCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
          <View style={{ alignItems: 'center' }}>
            <SleepDurationRing hours={state.sleep.lastHours} />
          </View>
          <View style={sleepStyles.durationMeta}>
            <View style={sleepStyles.metaRow}>
              <Moon size={14} color={colors.muted} strokeWidth={2} />
              <Text style={sleepStyles.metaLabel}>Bedtime</Text>
              <Text style={sleepStyles.metaValue}>{lastLog?.bedtime ?? state.user.bedtime}</Text>
            </View>
            <View style={sleepStyles.metaRow}>
              <BedDouble size={14} color={colors.muted} strokeWidth={2} />
              <Text style={sleepStyles.metaLabel}>Wake up</Text>
              <Text style={sleepStyles.metaValue}>{lastLog?.wakeTime ?? state.user.wakeTime}</Text>
            </View>
          </View>
        </View>

        {/* Sleep stages */}
        <View style={[sleepStyles.card, { backgroundColor: tc.surface, borderColor: tc.border }]}>
          <View style={sleepStyles.cardHeader}>
            <Text style={sleepStyles.cardTitle}>Sleep Stages</Text>
            <Text style={sleepStyles.cardSub}>estimated</Text>
          </View>
          <SleepStagesBar stages={stageData} totalHours={totalStageHours} />
        </View>

        {/* Bottom side-by-side metrics cards */}
        <View style={sleepStyles.bottomStatsRow}>
          <View style={[sleepStyles.bottomStatCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
            <Text style={sleepStyles.bottomStatVal}>{state.sleep.score}</Text>
            <Text style={sleepStyles.bottomStatLabel}>Sleep Score</Text>
            <Text style={[sleepStyles.bottomStatStatus, { color: state.sleep.score >= 75 ? colors.emerald : colors.amber }]}>
              {state.sleep.score >= 75 ? 'Good' : 'Fair'}
            </Text>
          </View>
          <View style={[sleepStyles.bottomStatCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
            <Text style={sleepStyles.bottomStatVal}>{state.sleep.consistency}%</Text>
            <Text style={sleepStyles.bottomStatLabel}>Sleep Consistency</Text>
            <Text style={[sleepStyles.bottomStatStatus, { color: colors.emerald }]}>Good</Text>
          </View>
        </View>

        {/* Weekly trend */}
        <View style={[sleepStyles.card, { backgroundColor: tc.surface, borderColor: tc.border }]}>
          <View style={sleepStyles.cardHeader}>
            <Text style={sleepStyles.cardTitle}>Weekly Trend</Text>
            <Text style={sleepStyles.cardSub}>Last 7 nights</Text>
          </View>
          <MiniBarChart
            values={logs.map((l) => l.hours)}
            max={9}
            color={colors.lilac}
            labels={labels}
            goal={7.5}
          />
        </View>

        {/* Insight */}
        <View style={sleepStyles.insightCard}>
          <View style={sleepStyles.insightIcon}>
            <Info size={16} color={colors.lilac} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={sleepStyles.insightLabel}>Sleep Insight</Text>
            <Text style={sleepStyles.insightText}>{insightText}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Log Modal */}
      <Modal visible={showLogModal} animationType="slide" transparent onRequestClose={() => setShowLogModal(false)}>
        <View style={sleepStyles.modalOverlay}>
          <TouchableOpacity style={sleepStyles.modalBackdrop} onPress={() => setShowLogModal(false)} activeOpacity={1} />
          <View style={[sleepStyles.modalSheet, { backgroundColor: tc.surface, borderColor: tc.border }]}>
            <View style={sleepStyles.modalHandle} />
            <View style={sleepStyles.modalHeader}>
              <Text style={sleepStyles.modalTitle}>Log Sleep</Text>
              <TouchableOpacity onPress={() => setShowLogModal(false)} accessibilityLabel="Close">
                <X size={18} color={colors.muted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={sleepStyles.modalField}>
              <Text style={sleepStyles.modalLabel}>Sleep duration (hours)</Text>
              <TextInput
                value={hoursInput}
                onChangeText={setHoursInput}
                keyboardType="decimal-pad"
                placeholder="7.5"
                placeholderTextColor={colors.subtle}
                style={sleepStyles.modalInput}
                autoFocus
              />
            </View>
            <View style={sleepStyles.modalRow}>
              <View style={[sleepStyles.modalField, { flex: 1 }]}>
                <Text style={sleepStyles.modalLabel}>Bedtime</Text>
                <TextInput
                  value={bedtimeInput}
                  onChangeText={setBedtimeInput}
                  placeholder="22:30"
                  placeholderTextColor={colors.subtle}
                  style={sleepStyles.modalInput}
                />
              </View>
              <View style={[sleepStyles.modalField, { flex: 1 }]}>
                <Text style={sleepStyles.modalLabel}>Wake time</Text>
                <TextInput
                  value={wakeInput}
                  onChangeText={setWakeInput}
                  placeholder="06:30"
                  placeholderTextColor={colors.subtle}
                  style={sleepStyles.modalInput}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={handleLog}
              disabled={!Number(hoursInput)}
              style={[sleepStyles.modalBtn, !Number(hoursInput) && { opacity: 0.4 }]}
              accessibilityLabel="Save sleep"
            >
              <Text style={sleepStyles.modalBtnText}>Save Sleep Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const sleepStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 110,
    gap: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.ink,
    fontSize: type.body + 2,
    fontWeight: fontWeight.black,
    textAlign: 'center',
  },
  logBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  dateSwitcherArrow: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: fontWeight.bold,
  },
  dateSwitcherText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.extrabold,
  },
  bottomStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bottomStatCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...shadow,
  },
  bottomStatVal: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: fontWeight.black,
  },
  bottomStatLabel: {
    color: colors.muted,
    fontSize: type.micro,
    fontWeight: fontWeight.bold,
  },
  bottomStatStatus: {
    fontSize: type.small,
    fontWeight: fontWeight.black,
    marginTop: 2,
  },
  durationCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
    ...shadow,
  },
  durationMain: {
    fontSize: 30,
    fontWeight: fontWeight.black,
    letterSpacing: -0.5,
  },
  durationSub: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  qualityBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
  },
  qualityText: {
    fontSize: type.small,
    fontWeight: fontWeight.black,
  },
  durationMeta: { gap: spacing.sm, width: '100%' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaLabel: { flex: 1, color: colors.muted, fontSize: type.small, fontWeight: fontWeight.bold },
  metaValue: { color: colors.ink, fontSize: type.small, fontWeight: fontWeight.extrabold },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.black,
  },
  cardSub: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  stageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stageGridItem: { alignItems: 'center', gap: 3 },
  stageGridVal: {
    fontSize: type.body,
    fontWeight: fontWeight.black,
  },
  stageGridLabel: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  logList: { gap: spacing.sm },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  logDate: {
    color: colors.ink,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  logMeta: {
    color: colors.muted,
    fontSize: type.micro,
    marginTop: 2,
  },
  logHours: {
    fontSize: type.body,
    fontWeight: fontWeight.black,
  },
  qualityPill: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  qualityPillText: {
    fontSize: type.micro,
    fontWeight: fontWeight.black,
  },
  insightCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lilacSoft,
    backgroundColor: `${colors.lilac}0D`,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.lilacSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  insightLabel: {
    color: colors.lilac,
    fontSize: type.micro,
    fontWeight: fontWeight.black,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  insightText: {
    color: colors.inkSoft,
    fontSize: type.small,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { color: colors.ink, fontSize: type.section, fontWeight: fontWeight.black },
  modalRow: { flexDirection: 'row', gap: spacing.md },
  modalField: { gap: spacing.sm },
  modalLabel: { color: colors.inkSoft, fontSize: type.small, fontWeight: fontWeight.bold },
  modalInput: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.lg,
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.semibold,
  },
  modalBtn: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: { color: colors.background, fontSize: type.body, fontWeight: fontWeight.black },
});
