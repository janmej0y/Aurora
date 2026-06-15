import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Droplets, Info, Plus, Settings, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { MiniBarChart, ScoreRing, WaterBottle } from '../components/visuals';
import { ProgressBar } from '../components/ui';
import { useHealth } from '../store/HealthContext';
import { colors, fontWeight, radius, shadow, spacing, type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export function HydrationScreen() {
  const { state, addWater, setHydrationGoal } = useHealth();
  const navigation = useNavigation<any>();
  const tc = useTheme();
  const [customAmount, setCustomAmount] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState(String(state.hydration.goalMl));

  const progress = Math.min(100, Math.round((state.hydration.currentMl / state.hydration.goalMl) * 100));
  const remaining = Math.max(0, state.hydration.goalMl - state.hydration.currentMl);
  const history = state.hydration.history.slice(-7);
  const labels = history.map((d) => new Date(`${d.date}T00:00:00`).toLocaleDateString('en', { weekday: 'short' }).slice(0, 1));
  const weekAvg = history.length ? Math.round(history.reduce((s, d) => s + d.amountMl, 0) / history.length) : 0;
  const consistencyScore = Math.round(
    (history.filter((d) => d.amountMl >= state.hydration.goalMl * 0.8).length / Math.max(history.length, 1)) * 100
  );

  const handleCustomAdd = () => {
    const amount = Number(customAmount);
    if (amount > 0 && amount <= 3000) {
      addWater(amount);
      setCustomAmount('');
      setShowCustomModal(false);
    } else {
      Alert.alert('Invalid amount', 'Please enter a value between 1 and 3000 ml.');
    }
  };

  const handleGoalSave = () => {
    const goal = Number(newGoal);
    if (goal >= 500 && goal <= 5000) {
      setHydrationGoal(goal);
      setShowGoalModal(false);
    } else {
      Alert.alert('Invalid goal', 'Goal must be between 500 and 5000 ml.');
    }
  };

  const insightText = progress >= 80
    ? "You're on track for today's goal. Stay consistent through the evening."
    : progress >= 50
    ? `You've crossed halfway. ${remaining} ml remaining — add a glass with your next meal.`
    : `You're at ${progress}% — ${remaining} ml to go. One steady glass now makes a difference.`;

  return (
    <SafeAreaView style={[hydStyles.screen, { backgroundColor: tc.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={hydStyles.scroll}>
        {/* Header */}
        <View style={hydStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[hydStyles.backBtn, { backgroundColor: tc.surface, borderColor: tc.border }]} accessibilityLabel="Back">
            <ChevronLeft size={20} color={colors.ink} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={hydStyles.headerTitle}>Hydration</Text>
          <TouchableOpacity
            onPress={() => setShowGoalModal(true)}
            style={[hydStyles.settingsBtn, { backgroundColor: tc.surface, borderColor: tc.border }]}
            accessibilityLabel="Hydration settings"
          >
            <Settings size={18} color={colors.muted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Side-by-Side Content Row */}
        <View style={hydStyles.mainRow}>
          {/* Left Column: Water bottle */}
          <View style={hydStyles.leftCol}>
            <WaterBottle progress={progress} amountMl={state.hydration.currentMl} goalMl={state.hydration.goalMl} />
          </View>

          {/* Right Column: Progress ring + quick add buttons */}
          <View style={hydStyles.rightCol}>
            <ScoreRing
              score={progress}
              label="Hydrated"
              color={colors.blue}
              size={110}
              strokeWidth={8}
              sublabel={`${state.hydration.currentMl}/${state.hydration.goalMl} ml`}
            />

            <View style={hydStyles.sideQuickList}>
              {[250, 500, 750].map((ml) => (
                <Pressable
                  key={ml}
                  onPress={() => addWater(ml)}
                  style={({ pressed }) => [
                    hydStyles.sideQuickBtn,
                    hydStyles.sideQuickBtnWater,
                    { backgroundColor: tc.surface, borderColor: colors.blueGlow },
                    pressed && hydStyles.sideQuickBtnPressed,
                  ]}
                  accessibilityLabel={`Add ${ml} ml`}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(59, 130, 246, 0.22)', 'rgba(59, 130, 246, 0.07)', 'rgba(21, 27, 35, 0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={hydStyles.sideQuickBtnWash}
                  />
                  <View style={hydStyles.sideQuickIconPlate}>
                    <Droplets size={12} color={colors.blue} strokeWidth={2.4} />
                  </View>
                  <Text style={hydStyles.sideQuickBtnLabel}>+{ml} ml</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setShowCustomModal(true)}
                style={({ pressed }) => [
                  hydStyles.sideQuickBtn,
                  hydStyles.sideQuickBtnCustom,
                  { backgroundColor: tc.surface2, borderColor: tc.borderStrong },
                  pressed && hydStyles.sideQuickBtnPressed,
                ]}
                accessibilityLabel="Custom amount"
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(255, 255, 255, 0.07)', 'rgba(255, 255, 255, 0.015)', 'rgba(255, 255, 255, 0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={hydStyles.sideQuickBtnWash}
                />
                <Plus size={13} color={colors.inkSoft} strokeWidth={2.4} />
                <Text style={hydStyles.sideQuickBtnCustomLabel}>Custom</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={hydStyles.progressSection}>
          <View style={hydStyles.progressRow}>
            <Text style={hydStyles.progressRemaining}>{remaining} ml remaining</Text>
            <Text style={[hydStyles.progressPct, { color: progress >= 80 ? colors.emerald : colors.blue }]}>
              {progress}%
            </Text>
          </View>
          <ProgressBar value={progress} accent={progress >= 80 ? colors.emerald : colors.blue} height={8} />
        </View>

        {/* Stats row */}
        <View style={hydStyles.statsRow}>
          <View style={[hydStyles.statCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
            <Text style={hydStyles.statValue}>{(weekAvg / 1000).toFixed(1)}L</Text>
            <Text style={hydStyles.statLabel}>7-day avg</Text>
          </View>
          <View style={[hydStyles.statCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
            <Text style={[hydStyles.statValue, { color: colors.emerald }]}>{consistencyScore}%</Text>
            <Text style={hydStyles.statLabel}>Consistency</Text>
          </View>
          <View style={[hydStyles.statCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
            <ScoreRing score={consistencyScore} label="Score" size={64} strokeWidth={6} color={colors.blue} />
          </View>
        </View>

        {/* Weekly chart */}
        <View style={[hydStyles.chartCard, { backgroundColor: tc.surface, borderColor: tc.borderStrong }]}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(59, 130, 246, 0.11)', 'rgba(59, 130, 246, 0.025)', 'rgba(59, 130, 246, 0)']}
            style={hydStyles.chartCardWash}
          />
          <Text style={hydStyles.sectionLabel}>7-Day History</Text>
          <MiniBarChart
            values={history.map((d) => d.amountMl)}
            max={state.hydration.goalMl}
            color={colors.blue}
            labels={labels}
            goal={state.hydration.goalMl}
          />
        </View>

        {/* Today's log */}
        <View style={[hydStyles.logCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
          <Text style={hydStyles.sectionLabel}>Today's Entries</Text>
          {history.filter((d) => d.date === new Date().toISOString().slice(0, 10)).length === 0 ? (
            <View style={hydStyles.logEmpty}>
              <Droplets size={18} color={colors.subtle} strokeWidth={2} />
              <Text style={hydStyles.logEmptyText}>No entries yet today</Text>
            </View>
          ) : (
            <View style={hydStyles.logRow}>
              <View style={[hydStyles.logDot, { backgroundColor: colors.blue }]} />
              <Text style={hydStyles.logText}>Today</Text>
              <Text style={[hydStyles.logAmount, { color: colors.blue }]}>
                {state.hydration.currentMl} ml
              </Text>
            </View>
          )}
        </View>

        {/* Insight */}
        <View style={hydStyles.insightCard}>
          <View style={hydStyles.insightIcon}>
            <Info size={16} color={colors.blue} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={hydStyles.insightLabel}>Hydration Insight</Text>
            <Text style={hydStyles.insightText}>{insightText}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Custom Amount Modal */}
      <Modal visible={showCustomModal} animationType="slide" transparent onRequestClose={() => setShowCustomModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={hydStyles.modalOverlay}>
          <TouchableOpacity style={hydStyles.modalBackdrop} onPress={() => setShowCustomModal(false)} activeOpacity={1} />
          <View style={[hydStyles.modalSheet, { backgroundColor: tc.surface, borderColor: tc.border }]}>
            <View style={hydStyles.modalHandle} />
            <View style={hydStyles.modalHeader}>
              <Text style={hydStyles.modalTitle}>Custom Amount</Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)} accessibilityLabel="Close">
                <X size={18} color={colors.muted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="Enter ml (e.g. 350)"
              placeholderTextColor={colors.subtle}
              keyboardType="numeric"
              style={hydStyles.modalInput}
              autoFocus
            />
            <TouchableOpacity
              onPress={handleCustomAdd}
              disabled={!Number(customAmount)}
              style={[hydStyles.modalBtn, !Number(customAmount) && { opacity: 0.4 }]}
              accessibilityLabel="Add water"
            >
              <Text style={hydStyles.modalBtnText}>Add {customAmount || '0'} ml</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Goal Modal */}
      <Modal visible={showGoalModal} animationType="slide" transparent onRequestClose={() => setShowGoalModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={hydStyles.modalOverlay}>
          <TouchableOpacity style={hydStyles.modalBackdrop} onPress={() => setShowGoalModal(false)} activeOpacity={1} />
          <View style={[hydStyles.modalSheet, { backgroundColor: tc.surface, borderColor: tc.border }]}>
            <View style={hydStyles.modalHandle} />
            <View style={hydStyles.modalHeader}>
              <Text style={hydStyles.modalTitle}>Daily Goal</Text>
              <TouchableOpacity onPress={() => setShowGoalModal(false)} accessibilityLabel="Close">
                <X size={18} color={colors.muted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={hydStyles.modalHint}>Recommended: 2000–3000 ml per day</Text>
            <TextInput
              value={newGoal}
              onChangeText={setNewGoal}
              keyboardType="numeric"
              style={hydStyles.modalInput}
              autoFocus
            />
            <TouchableOpacity onPress={handleGoalSave} style={hydStyles.modalBtn} accessibilityLabel="Save goal">
              <Text style={hydStyles.modalBtnText}>Save Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const hydStyles = StyleSheet.create({
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
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.lg,
  },
  leftCol: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightCol: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  sideQuickList: {
    width: '100%',
    gap: spacing.sm,
  },
  sideQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.blueSoft,
    backgroundColor: colors.surface,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  sideQuickBtnWater: {
    borderColor: colors.blueGlow,
  },
  sideQuickBtnWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  sideQuickIconPlate: {
    width: 21,
    height: 21,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideQuickBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  sideQuickBtnLabel: {
    color: colors.blue,
    fontSize: type.small,
    fontWeight: fontWeight.extrabold,
  },
  sideQuickBtnCustom: {
    borderColor: colors.border,
  },
  sideQuickBtnCustomLabel: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.extrabold,
  },
  sectionLabel: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.black,
    marginBottom: spacing.md,
  },
  progressSection: { gap: spacing.sm },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressRemaining: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.extrabold,
  },
  progressPct: {
    fontSize: type.body,
    fontWeight: fontWeight.black,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    gap: 4,
    ...shadow,
  },
  statValue: {
    color: colors.ink,
    fontSize: type.section,
    fontWeight: fontWeight.black,
  },
  statLabel: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  chartCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
    ...shadow,
  },
  chartCardWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 82,
  },
  logCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow,
  },
  logEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  logEmptyText: {
    color: colors.subtle,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logText: { flex: 1, color: colors.inkSoft, fontSize: type.small, fontWeight: fontWeight.bold },
  logAmount: { fontSize: type.small, fontWeight: fontWeight.extrabold },
  insightCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.blueSoft,
    backgroundColor: `${colors.blue}0D`,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  insightLabel: {
    color: colors.blue,
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
  modalTitle: {
    color: colors.ink,
    fontSize: type.section,
    fontWeight: fontWeight.black,
  },
  modalHint: {
    color: colors.muted,
    fontSize: type.small,
  },
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
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    color: colors.background,
    fontSize: type.body,
    fontWeight: fontWeight.black,
  },
});
