import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Activity,
  BedDouble,
  Droplets,
  Flame,
  Salad,
  Sparkles,
  Zap,
  AlarmClock,
  Target,
  Bell,
} from 'lucide-react-native';

import { GoalChip, ProgressBar } from '../components/ui';
import { useHealth } from '../store/HealthContext';
import { Goal, ActivityLevel, Gender } from '../types/health';
import { colors, fontWeight, radius, spacing, type } from '../theme/tokens';

type Step = 'personal' | 'lifestyle' | 'goals' | 'notifications';

const STEPS: Step[] = ['personal', 'lifestyle', 'goals', 'notifications'];
const STEP_LABELS = ['Personal', 'Lifestyle', 'Goals', 'Notify'];

const genders: Gender[] = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
const activityLevels: { value: ActivityLevel; description: string; icon: typeof Activity }[] = [
  { value: 'Light', description: 'Desk work, occasional walking', icon: Activity },
  { value: 'Moderate', description: 'Some exercise 3–4x/week', icon: Zap },
  { value: 'Active', description: 'Daily workouts & active lifestyle', icon: Flame },
  { value: 'Athlete', description: 'Intense training 6–7x/week', icon: Target },
];

const goalData: { goal: Goal; icon: typeof Droplets; description: string }[] = [
  { goal: 'Improve Hydration', icon: Droplets, description: 'Stay on top of your water intake' },
  { goal: 'Sleep Better', icon: BedDouble, description: 'Understand and improve sleep patterns' },
  { goal: 'Build Better Habits', icon: Sparkles, description: 'Build consistency every day' },
  { goal: 'Eat Healthier', icon: Salad, description: 'Fuel your body the right way' },
  { goal: 'Improve Energy Levels', icon: Zap, description: 'Feel more energized throughout the day' },
  { goal: 'Improve Consistency', icon: Flame, description: 'Show up for yourself every day' },
];

function StepProgress({ currentStep }: { currentStep: Step }) {
  const idx = STEPS.indexOf(currentStep);
  const pct = ((idx + 1) / STEPS.length) * 100;
  return (
    <View style={onbStyles.progress}>
      <ProgressBar value={pct} accent={colors.emerald} height={4} />
      <View style={onbStyles.stepLabels}>
        {STEP_LABELS.map((label, i) => (
          <Text
            key={label}
            style={[onbStyles.stepLabel, i <= idx && onbStyles.stepLabelActive]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function SelectChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[onbStyles.chip, selected && onbStyles.chipSelected]}
      accessibilityLabel={label}
    >
      <Text style={[onbStyles.chipText, selected && onbStyles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function OnboardingScreen() {
  const { state, saveProfile, completeOnboarding, toggleGoal, goalOptions, toggleNotification } = useHealth();
  const [step, setStep] = useState<Step>('personal');
  const [name, setName] = useState(state.user.name);
  const [age, setAge] = useState(state.user.age);
  const [gender, setGender] = useState<Gender>(state.user.gender);
  const [height, setHeight] = useState(state.user.heightCm);
  const [weight, setWeight] = useState(state.user.weightKg);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(state.user.activityLevel);
  const [wakeTime, setWakeTime] = useState(state.user.wakeTime);
  const [bedtime, setBedtime] = useState(state.user.bedtime);

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      // Save relevant data before moving
      if (step === 'personal') {
        saveProfile({ name: name.trim() || 'Friend', age, gender, heightCm: height, weightKg: weight });
      } else if (step === 'lifestyle') {
        saveProfile({ activityLevel, wakeTime, bedtime });
      }
      setStep(STEPS[idx + 1]);
    } else {
      // Final step: sync goals to Supabase before completing
      saveProfile({ goals: state.user.goals });
      completeOnboarding();
    }
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const renderStep = () => {
    switch (step) {
      case 'personal':
        return (
          <View style={onbStyles.stepContent}>
            <Text style={onbStyles.stepTitle}>Tell us about you</Text>
            <Text style={onbStyles.stepSubtitle}>
              This helps Aurora personalize your health goals and targets.
            </Text>

            <View style={onbStyles.form}>
              <View style={onbStyles.field}>
                <Text style={onbStyles.fieldLabel}>Your Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Name"
                  placeholderTextColor={colors.subtle}
                  style={onbStyles.input}
                />
              </View>

              <View style={onbStyles.row}>
                <View style={[onbStyles.field, { flex: 1 }]}>
                  <Text style={onbStyles.fieldLabel}>Age</Text>
                  <TextInput
                    value={age}
                    onChangeText={setAge}
                    placeholder="28"
                    placeholderTextColor={colors.subtle}
                    keyboardType="numeric"
                    style={onbStyles.input}
                  />
                </View>
                <View style={[onbStyles.field, { flex: 1 }]}>
                  <Text style={onbStyles.fieldLabel}>Height (cm)</Text>
                  <TextInput
                    value={height}
                    onChangeText={setHeight}
                    placeholder="168"
                    placeholderTextColor={colors.subtle}
                    keyboardType="numeric"
                    style={onbStyles.input}
                  />
                </View>
              </View>

              <View style={onbStyles.row}>
                <View style={[onbStyles.field, { flex: 1 }]}>
                  <Text style={onbStyles.fieldLabel}>Weight (kg)</Text>
                  <TextInput
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="62"
                    placeholderTextColor={colors.subtle}
                    keyboardType="numeric"
                    style={onbStyles.input}
                  />
                </View>
                <View style={{ flex: 1 }} />
              </View>

              <View style={onbStyles.field}>
                <Text style={onbStyles.fieldLabel}>Gender</Text>
                <View style={onbStyles.chipRow}>
                  {genders.map((g) => (
                    <SelectChip
                      key={g}
                      label={g}
                      selected={gender === g}
                      onPress={() => setGender(g)}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        );

      case 'lifestyle':
        return (
          <View style={onbStyles.stepContent}>
            <Text style={onbStyles.stepTitle}>Your lifestyle</Text>
            <Text style={onbStyles.stepSubtitle}>
              Aurora uses this to set smarter daily targets for hydration and sleep.
            </Text>

            <View style={onbStyles.form}>
              <View style={onbStyles.field}>
                <Text style={onbStyles.fieldLabel}>Activity Level</Text>
                <View style={onbStyles.activityGrid}>
                  {activityLevels.map((item) => {
                    const Icon = item.icon;
                    const selected = activityLevel === item.value;
                    return (
                      <TouchableOpacity
                        key={item.value}
                        onPress={() => setActivityLevel(item.value)}
                        style={[onbStyles.activityCard, selected && onbStyles.activityCardSelected]}
                        accessibilityLabel={item.value}
                      >
                        <Icon size={20} color={selected ? colors.emerald : colors.muted} strokeWidth={2} />
                        <Text style={[onbStyles.activityLabel, selected && onbStyles.activityLabelSelected]}>
                          {item.value}
                        </Text>
                        <Text style={onbStyles.activityDesc}>{item.description}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={onbStyles.row}>
                <View style={[onbStyles.field, { flex: 1 }]}>
                  <Text style={onbStyles.fieldLabel}>Wake Time</Text>
                  <View style={onbStyles.timeInput}>
                    <AlarmClock size={16} color={colors.muted} strokeWidth={2} />
                    <TextInput
                      value={wakeTime}
                      onChangeText={setWakeTime}
                      placeholder="06:30"
                      placeholderTextColor={colors.subtle}
                      style={[onbStyles.input, { flex: 1, minHeight: 0 }]}
                    />
                  </View>
                </View>
                <View style={[onbStyles.field, { flex: 1 }]}>
                  <Text style={onbStyles.fieldLabel}>Bedtime</Text>
                  <View style={onbStyles.timeInput}>
                    <BedDouble size={16} color={colors.muted} strokeWidth={2} />
                    <TextInput
                      value={bedtime}
                      onChangeText={setBedtime}
                      placeholder="22:30"
                      placeholderTextColor={colors.subtle}
                      style={[onbStyles.input, { flex: 1, minHeight: 0 }]}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        );

      case 'goals':
        return (
          <View style={onbStyles.stepContent}>
            <Text style={onbStyles.stepTitle}>What are your goals?</Text>
            <Text style={onbStyles.stepSubtitle}>
              Select what you want Aurora to focus on. You can change this anytime.
            </Text>
            <View style={onbStyles.goalList}>
              {goalData.map(({ goal, icon, description }) => (
                <GoalChip
                  key={goal}
                  label={goal}
                  description={description}
                  icon={icon}
                  selected={state.user.goals.includes(goal)}
                  onPress={() => toggleGoal(goal)}
                />
              ))}
            </View>
          </View>
        );

      case 'notifications':
        return (
          <View style={onbStyles.stepContent}>
            <Text style={onbStyles.stepTitle}>Stay on track</Text>
            <Text style={onbStyles.stepSubtitle}>
              Aurora will send you gentle reminders to keep you consistent.
            </Text>

            <View style={onbStyles.notifList}>
              {[
                {
                  key: 'hydrationReminders' as const,
                  icon: Droplets,
                  title: 'Hydration Reminders',
                  desc: 'Smart nudges to hit your water goal',
                  accent: colors.blue,
                },
                {
                  key: 'sleepReminders' as const,
                  icon: BedDouble,
                  title: 'Sleep Reminders',
                  desc: 'Bedtime prompts near your routine',
                  accent: colors.lilac,
                },
                {
                  key: 'habitReminders' as const,
                  icon: Sparkles,
                  title: 'Habit Reminders',
                  desc: 'Daily check-ins for your habits',
                  accent: colors.emerald,
                },
                {
                  key: 'dailyInsights' as const,
                  icon: Bell,
                  title: 'Daily Insights',
                  desc: 'Fresh readouts when Aurora spots a pattern',
                  accent: colors.amber,
                },
              ].map((item) => {
                const Icon = item.icon;
                const enabled = state.notifications[item.key];
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => toggleNotification(item.key)}
                    style={[onbStyles.notifCard, enabled && { borderColor: `${item.accent}44` }]}
                    accessibilityLabel={item.title}
                  >
                    <View style={[onbStyles.notifIcon, { backgroundColor: `${item.accent}18` }]}>
                      <Icon size={18} color={item.accent} strokeWidth={2} />
                    </View>
                    <View style={onbStyles.notifText}>
                      <Text style={onbStyles.notifTitle}>{item.title}</Text>
                      <Text style={onbStyles.notifDesc}>{item.desc}</Text>
                    </View>
                    <View style={[onbStyles.toggle, enabled && { backgroundColor: item.accent, borderColor: item.accent }]}>
                      <View style={[onbStyles.toggleThumb, enabled && onbStyles.toggleThumbOn]} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={onbStyles.screen}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={onbStyles.flex}>
        {/* Header */}
        <View style={onbStyles.header}>
          <Text style={onbStyles.brand}>AURORA</Text>
          <Text style={onbStyles.headerStep}>Step {STEPS.indexOf(step) + 1} of {STEPS.length}</Text>
        </View>

        <StepProgress currentStep={step} />

        <ScrollView
          contentContainerStyle={onbStyles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>

        {/* Navigation */}
        <View style={onbStyles.nav}>
          <TouchableOpacity
            onPress={goBack}
            disabled={step === 'personal'}
            style={[onbStyles.backBtn, step === 'personal' && { opacity: 0.3 }]}
            accessibilityLabel="Back"
          >
            <Text style={onbStyles.backText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={goNext}
            style={onbStyles.nextBtn}
            accessibilityLabel={step === 'notifications' ? 'Get started' : 'Next'}
          >
            <Text style={onbStyles.nextText}>
              {step === 'notifications' ? 'Start Tracking →' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const onbStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  brand: {
    color: colors.ink,
    fontSize: type.small,
    fontWeight: fontWeight.black,
    letterSpacing: 4,
  },
  headerStep: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  progress: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepLabel: {
    color: colors.subtle,
    fontSize: type.micro,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepLabelActive: {
    color: colors.emerald,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  stepContent: {
    gap: spacing.xl,
    paddingTop: spacing.md,
  },
  stepTitle: {
    color: colors.ink,
    fontSize: type.display,
    fontWeight: fontWeight.black,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  stepSubtitle: {
    color: colors.muted,
    fontSize: type.body,
    lineHeight: 24,
    marginTop: -spacing.md,
  },
  form: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  field: { gap: spacing.sm },
  fieldLabel: {
    color: colors.inkSoft,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.2,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.semibold,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.emeraldSoft,
    borderColor: colors.emerald,
  },
  chipText: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  chipTextSelected: {
    color: colors.emerald,
  },
  activityGrid: {
    gap: spacing.sm,
  },
  activityCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: 4,
  },
  activityCardSelected: {
    borderColor: colors.emerald,
    backgroundColor: colors.emeraldSoft,
  },
  activityLabel: {
    color: colors.inkSoft,
    fontSize: type.body,
    fontWeight: fontWeight.extrabold,
  },
  activityLabelSelected: {
    color: colors.emerald,
  },
  activityDesc: {
    color: colors.muted,
    fontSize: type.small,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  goalList: { gap: spacing.sm },
  notifList: { gap: spacing.sm },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifText: { flex: 1 },
  notifTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.bold,
  },
  notifDesc: {
    color: colors.muted,
    fontSize: type.small,
    marginTop: 2,
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 3,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.muted,
  },
  toggleThumbOn: {
    transform: [{ translateX: 20 }],
    backgroundColor: colors.background,
  },
  nav: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backBtn: {
    minWidth: 88,
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: {
    color: colors.muted,
    fontSize: type.body,
    fontWeight: fontWeight.bold,
  },
  nextBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    color: colors.background,
    fontSize: type.body,
    fontWeight: fontWeight.black,
  },
});
