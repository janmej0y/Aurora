import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Activity,
  Apple,
  ArrowLeft,
  Check,
  HeartPulse,
  Info,
  Link2,
  Link2Off,
  RefreshCw,
  Watch,
} from 'lucide-react-native';

import { useHealth } from '../store/HealthContext';
import { colors, fontWeight, radius, shadow, spacing, type } from '../theme/tokens';
import { TrackingMode } from '../types/health';

type DeviceItem = {
  id: TrackingMode | 'Samsung Health' | 'Oura Ring';
  name: string;
  subtitle: string;
  icon: any;
  accent: string;
};

const DEVICES: DeviceItem[] = [
  {
    id: 'Apple Health',
    name: 'Apple Health',
    subtitle: 'Primary health system on iOS devices',
    icon: Apple,
    accent: colors.coral,
  },
  {
    id: 'Health Connect',
    name: 'Health Connect',
    subtitle: 'Google Android health storage system',
    icon: HeartPulse,
    accent: colors.blue,
  },
  {
    id: 'Oura Ring',
    name: 'Oura Ring',
    subtitle: 'Smart ring sleep & readiness data',
    icon: Watch,
    accent: colors.lilac,
  },
  {
    id: 'Garmin',
    name: 'Garmin Connect',
    subtitle: 'Heart rate, workouts, & active energy',
    icon: Activity,
    accent: colors.amber,
  },
  {
    id: 'Fitbit',
    name: 'Fitbit Integration',
    subtitle: 'Steps, hydration, & sleep tracking',
    icon: Watch,
    accent: colors.emerald,
  },
  {
    id: 'Samsung Health',
    name: 'Samsung Health',
    subtitle: 'Activity & nutrition log import',
    icon: HeartPulse,
    accent: colors.coral,
  },
];

export function DeviceIntegrationsScreen({ navigation }: { navigation: any }) {
  const { state, configureTracking } = useHealth();
  const [connections, setConnections] = useState<Record<string, boolean>>({
    'Manual Tracking': true,
    'Apple Health': state.trackingModes.includes('Apple Health'),
    'Health Connect': state.trackingModes.includes('Health Connect'),
    Garmin: state.trackingModes.includes('Garmin'),
    Fitbit: state.trackingModes.includes('Fitbit'),
    'Oura Ring': false,
    'Samsung Health': false,
  });

  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncMetrics, setSyncMetrics] = useState<Record<string, boolean>>({
    sleep: true,
    hydration: true,
    habits: true,
    meals: false,
  });

  const toggleConnection = (id: string) => {
    const nextVal = !connections[id];
    setConnections((prev) => ({ ...prev, [id]: nextVal }));

    // Propagate to global store
    const enabledModes = Object.keys(connections)
      .filter((k) => (k === id ? nextVal : connections[k]))
      .filter((k) => k !== 'Oura Ring' && k !== 'Samsung Health') as TrackingMode[];

    configureTracking(enabledModes.length ? enabledModes : ['Manual Tracking']);
  };

  const handleSyncNow = (id: string) => {
    setSyncing(id);
    setTimeout(() => {
      setSyncing(null);
    }, 1200);
  };

  return (
    <SafeAreaView style={devStyles.screen}>
      {/* Header */}
      <View style={devStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={devStyles.backBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={18} color={colors.ink} strokeWidth={2} />
        </TouchableOpacity>
        <View style={devStyles.headerCenter}>
          <Text style={devStyles.title}>Devices</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={devStyles.scroll}>
        {/* Intro */}
        <View style={devStyles.introCard}>
          <Info size={16} color={colors.blue} strokeWidth={2} />
          <Text style={devStyles.introText}>
            Aurora syncs metrics automatically in the background. Toggle permissions to authorize data
            exchange.
          </Text>
        </View>

        {/* Sync Settings */}
        <View style={devStyles.section}>
          <Text style={devStyles.sectionLabel}>Sync Preferences</Text>
          <View style={devStyles.preferencesCard}>
            {[
              { key: 'sleep', label: 'Sleep & Recovery data' },
              { key: 'hydration', label: 'Water Intake logs' },
              { key: 'habits', label: 'Habits Consistency' },
              { key: 'meals', label: 'Meals & Nutrient metrics' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setSyncMetrics((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                style={devStyles.checkboxRow}
                accessibilityLabel={item.label}
              >
                <View
                  style={[
                    devStyles.checkbox,
                    syncMetrics[item.key] && {
                      backgroundColor: colors.emerald,
                      borderColor: colors.emerald,
                    },
                  ]}
                >
                  {syncMetrics[item.key] ? (
                    <Check size={12} color={colors.background} strokeWidth={3} />
                  ) : null}
                </View>
                <Text style={devStyles.checkboxLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Devices list */}
        <View style={devStyles.section}>
          <Text style={devStyles.sectionLabel}>Available Wearables & Systems</Text>
          <View style={devStyles.deviceList}>
            {DEVICES.map((dev) => {
              const Icon = dev.icon;
              const isConnected = connections[dev.id] || false;
              const isSyncingThis = syncing === dev.id;

              return (
                <View key={dev.id} style={devStyles.deviceCard}>
                  <View style={devStyles.deviceRow}>
                    <View style={[devStyles.iconWrap, { backgroundColor: `${dev.accent}18` }]}>
                      <Icon size={18} color={dev.accent} strokeWidth={2} />
                    </View>
                    <View style={devStyles.deviceInfo}>
                      <Text style={devStyles.deviceName}>{dev.name}</Text>
                      <Text style={devStyles.deviceDesc}>{dev.subtitle}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleConnection(dev.id)}
                      style={[
                        devStyles.connBtn,
                        isConnected ? devStyles.connBtnConnected : devStyles.connBtnDisconnected,
                      ]}
                      accessibilityLabel={isConnected ? `Disconnect ${dev.name}` : `Connect ${dev.name}`}
                    >
                      {isConnected ? (
                        <>
                          <Link2Off size={12} color={colors.coral} strokeWidth={2} />
                          <Text style={[devStyles.connBtnText, { color: colors.coral }]}>Disconnect</Text>
                        </>
                      ) : (
                        <>
                          <Link2 size={12} color={colors.emerald} strokeWidth={2} />
                          <Text style={[devStyles.connBtnText, { color: colors.emerald }]}>Connect</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* If connected, show details & manual sync trigger */}
                  {isConnected && (
                    <View style={devStyles.connectedDrawer}>
                      <View style={devStyles.statusRow}>
                        <View style={devStyles.statusDot} />
                        <Text style={devStyles.statusText}>Authorized & Active</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleSyncNow(dev.id)}
                        disabled={isSyncingThis}
                        style={devStyles.syncBtn}
                        accessibilityLabel={`Sync ${dev.name} now`}
                      >
                        <RefreshCw
                          size={12}
                          color={colors.inkSoft}
                          style={isSyncingThis ? devStyles.rotatingIcon : null}
                        />
                        <Text style={devStyles.syncBtnText}>
                          {isSyncingThis ? 'Syncing...' : 'Sync Now'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const devStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: {
    color: colors.ink,
    fontSize: type.section,
    fontWeight: fontWeight.black,
    letterSpacing: -0.3,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  introCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  introText: {
    flex: 1,
    color: colors.inkSoft,
    fontSize: type.small,
    lineHeight: 18,
    fontWeight: fontWeight.medium,
  },
  section: { gap: spacing.sm },
  sectionLabel: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.black,
    marginBottom: spacing.xs,
  },
  preferencesCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    color: colors.inkSoft,
    fontSize: type.small,
    fontWeight: fontWeight.semibold,
  },
  deviceList: { gap: spacing.md },
  deviceCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: { flex: 1, gap: 2 },
  deviceName: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.bold,
  },
  deviceDesc: {
    color: colors.muted,
    fontSize: type.micro,
  },
  connBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  connBtnConnected: {
    borderColor: `${colors.coral}33`,
    backgroundColor: colors.dangerSoft,
  },
  connBtnDisconnected: {
    borderColor: `${colors.emerald}33`,
    backgroundColor: colors.emeraldSoft,
  },
  connBtnText: {
    fontSize: type.micro,
    fontWeight: fontWeight.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  connectedDrawer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  statusText: {
    color: colors.muted,
    fontSize: type.micro,
    fontWeight: fontWeight.bold,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  syncBtnText: {
    color: colors.inkSoft,
    fontSize: type.micro,
    fontWeight: fontWeight.extrabold,
  },
  rotatingIcon: {
    transform: [{ rotate: '45deg' }],
  },
});
