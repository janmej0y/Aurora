import { useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Activity, Apple, Bluetooth, HeartPulse, PenLine, Watch } from 'lucide-react-native';

import { Button, Pill, Screen, ToggleRow } from '../components/ui';
import { useFadeIn } from '../hooks/useFadeIn';
import { useHealth } from '../store/HealthContext';
import { TrackingMode } from '../types/health';
import { colors, radius, shadow, spacing, type } from '../theme/tokens';

const modes: { label: TrackingMode; icon: typeof PenLine; subtitle: string }[] = [
  { label: 'Manual Tracking', icon: PenLine, subtitle: 'Fast logging for water, sleep, meals, and habits.' },
  { label: 'Apple Health', icon: Apple, subtitle: 'Prepared connection path for iOS builds.' },
  { label: 'Health Connect', icon: HeartPulse, subtitle: 'Prepared connection path for Android builds.' },
  { label: 'Fitbit', icon: Watch, subtitle: 'Bonus wearable connection placeholder.' },
  { label: 'Garmin', icon: Activity, subtitle: 'Bonus activity device placeholder.' },
];

export function TrackingSetupScreen() {
  const { configureTracking } = useHealth();
  const [selected, setSelected] = useState<TrackingMode[]>(['Manual Tracking']);
  const fade = useFadeIn();

  const toggleMode = (mode: TrackingMode) => {
    setSelected((current) =>
      current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode],
    );
  };

  const openAurora = () => {
    const modesToSave: TrackingMode[] = selected.length ? selected : ['Manual Tracking'];
    configureTracking(modesToSave);
  };

  return (
    <Screen>
      <Animated.View style={[setupStyles.header, fade]}>
        <Text style={setupStyles.eyebrow}>Health data setup</Text>
        <Text style={setupStyles.title}>Choose how Aurora should listen.</Text>
        <Text style={setupStyles.subtitle}>Manual tracking is fully functional. Device integrations are framed for demo readiness.</Text>
      </Animated.View>

      <View style={setupStyles.modeList}>
        {modes.map((mode) => (
          <ToggleRow
            key={mode.label}
            title={mode.label}
            subtitle={mode.subtitle}
            icon={mode.icon}
            value={selected.includes(mode.label)}
            onPress={() => toggleMode(mode.label)}
          />
        ))}
      </View>

      <View style={setupStyles.summary}>
        <Bluetooth size={20} color={colors.emerald} />
        <View style={setupStyles.summaryText}>
          <Text style={setupStyles.summaryTitle}>Selected sources</Text>
          <View style={setupStyles.pillWrap}>
            {selected.map((mode) => (
              <Pill key={mode} label={mode} selected onPress={() => toggleMode(mode)} />
            ))}
          </View>
        </View>
      </View>

      <Button onPress={openAurora}>Open Aurora</Button>
    </Screen>
  );
}

const setupStyles = StyleSheet.create({
  header: {
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.emerald,
    fontSize: type.small,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  title: {
    color: colors.ink,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: colors.muted,
    fontSize: type.body,
    lineHeight: 24,
  },
  modeList: {
    gap: spacing.md,
  },
  summary: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    ...shadow,
  },
  summaryText: {
    flex: 1,
    gap: spacing.md,
  },
  summaryTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '900',
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
