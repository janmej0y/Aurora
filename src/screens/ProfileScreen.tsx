import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Flame,
  ListChecks,
  LogOut,
  Medal,
  RefreshCw,
  Shield,
  Sparkles,
  User,
  Sliders,
  Database,
  Globe,
  Palette,
  Lock,
  Trash2,
  X,
  Target,
} from 'lucide-react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { ScoreRing } from '../components/visuals';
import { InitialsAvatar } from '../components/ui';
import { useHealth } from '../store/HealthContext';
import { colors, fontWeight, radius, shadow, spacing, type } from '../theme/tokens';
import { Gender, Goal, NotificationKey } from '../types/health';

function SettingsRow({
  icon: Icon,
  label,
  value,
  accent = colors.muted,
  onPress,
  destructive = false,
}: {
  icon: any;
  label: string;
  value?: string;
  accent?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={profileStyles.settingsRow}
      accessibilityLabel={label}
    >
      <View style={[profileStyles.settingsIcon, { backgroundColor: `${accent}18` }]}>
        <Icon size={16} color={destructive ? colors.coral : accent} strokeWidth={2} />
      </View>
      <Text style={[profileStyles.settingsLabel, destructive && { color: colors.coral }]}>{label}</Text>
      {value && <Text style={profileStyles.settingsValue}>{value}</Text>}
      <ChevronRight size={14} color={colors.subtle} strokeWidth={2} />
    </TouchableOpacity>
  );
}

export function ProfileScreen() {
  const { state, logout, resetDemo, saveProfile, toggleGoal, toggleNotification, setTheme } = useHealth();
  const navigation = useNavigation<any>();

  const [activeModal, setActiveModal] = useState<
    'personal' | 'goals' | 'notifications' | 'ai' | 'units' | 'theme' | 'language' | 'privacy' | 'account' | null
  >(null);

  // Form states
  const [name, setName] = useState(state.user.name);
  const [age, setAge] = useState(state.user.age);
  const [height, setHeight] = useState(state.user.heightCm);
  const [weight, setWeight] = useState(state.user.weightKg);
  const [gender, setGender] = useState<Gender>(state.user.gender);

  // Preference states stubs
  const [aiCoachStyle, setAiCoachStyle] = useState<'Warm' | 'Direct' | 'Detail-Oriented'>('Direct');
  const [units, setUnits] = useState<'Metric' | 'Imperial'>('Metric');
  const [lang, setLang] = useState<'English' | 'Spanish' | 'German' | 'Japanese'>('English');
  const themeMode = state.theme || 'Charcoal';

  const firstName = state.user.name.trim().split(' ')[0] || 'Friend';
  const totalHabits = state.habits.length;
  const longestStreak = Math.max(...state.habits.map((h) => h.longestStreak), 0);
  const currentStreak = Math.max(...state.habits.map((h) => h.streak), 0);
  const sleepAvg = state.sleep.weeklyAverage;

  const hydPct = Math.min(100, Math.round((state.hydration.currentMl / state.hydration.goalMl) * 100));
  const activeHabits = state.habits.filter((h) => !h.paused);
  const completedHabits = activeHabits.filter((h) => h.completedToday).length;
  const habitPct = activeHabits.length ? Math.round((completedHabits / activeHabits.length) * 100) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const mealsToday = state.meals.filter((m) => m.date === today);
  const calories = mealsToday.reduce((s, m) => s + m.calories, 0);

  const healthScore = Math.round(
    (hydPct * 0.25) + (Math.min(100, (state.sleep.lastHours / 8) * 100) * 0.3) + (habitPct * 0.25) + (Math.min(100, (calories / 2000) * 100) * 0.2)
  );

  const handleSavePersonal = () => {
    saveProfile({
      name: name.trim() || 'Maya',
      age,
      heightCm: height,
      weightKg: weight,
      gender,
    });
    setActiveModal(null);
  };

  const triggerDataExport = () => {
    Alert.alert(
      'Export Data',
      'Aurora will generate a package containing hydration entries, sleep intervals, meal records, and conversation history in standard JSON format.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export as JSON',
          onPress: () => {
            Alert.alert('Export Complete', 'Exported 184 activity events. Package successfully saved.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={profileStyles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={profileStyles.scroll}>
        {/* Header */}
        <View style={profileStyles.header}>
          <Text style={profileStyles.eyebrow}>Account</Text>
          <Text style={profileStyles.title}>Profile</Text>
        </View>

        {/* Profile card */}
        <View style={profileStyles.profileCard}>
          <LinearGradient
            pointerEvents="none"
            colors={[`${colors.emerald}14`, `${colors.blue}0A`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={profileStyles.avatarWrap}>
            <InitialsAvatar name={state.user.name} size={72} />
            <View style={profileStyles.verifiedBadge}>
              <Text style={profileStyles.verifiedText}>✓</Text>
            </View>
          </View>
          <View style={profileStyles.profileInfo}>
            <Text style={profileStyles.profileName}>{state.user.name}</Text>
            <Text style={profileStyles.profileEmail}>{state.user.email || 'maya.k@aurora.health'}</Text>
            <View style={profileStyles.planBadge}>
              <Sparkles size={11} color={colors.amber} strokeWidth={2} />
              <Text style={profileStyles.planText}>Aurora Premium</Text>
            </View>
          </View>
          <ScoreRing score={healthScore} label="Today" color={colors.emerald} size={72} strokeWidth={7} />
        </View>

        {/* Stats row */}
        <View style={profileStyles.statsRow}>
          <View style={profileStyles.statItem}>
            <Flame size={16} color={colors.amber} strokeWidth={2} />
            <Text style={[profileStyles.statVal, { color: colors.amber }]}>{currentStreak}d</Text>
            <Text style={profileStyles.statLabel}>Current Streak</Text>
          </View>
          <View style={profileStyles.statDivider} />
          <View style={profileStyles.statItem}>
            <ListChecks size={16} color={colors.emerald} strokeWidth={2} />
            <Text style={[profileStyles.statVal, { color: colors.emerald }]}>{totalHabits}</Text>
            <Text style={profileStyles.statLabel}>Total Habits</Text>
          </View>
          <View style={profileStyles.statDivider} />
          <View style={profileStyles.statItem}>
            <Medal size={16} color={colors.lilac} strokeWidth={2} />
            <Text style={[profileStyles.statVal, { color: colors.lilac }]}>{longestStreak}d</Text>
            <Text style={profileStyles.statLabel}>Best Streak</Text>
          </View>
          <View style={profileStyles.statDivider} />
          <View style={profileStyles.statItem}>
            <Text style={profileStyles.sleepIcon}>🌙</Text>
            <Text style={[profileStyles.statVal, { color: colors.blue }]}>{sleepAvg}h</Text>
            <Text style={profileStyles.statLabel}>Sleep Avg</Text>
          </View>
        </View>

        {/* Goals Summary Card */}
        <TouchableOpacity onPress={() => setActiveModal('goals')} style={profileStyles.goalsCard}>
          <View style={profileStyles.goalsHeader}>
            <Text style={profileStyles.sectionLabel}>Your Health Focus</Text>
            <ChevronRight size={14} color={colors.subtle} strokeWidth={2} />
          </View>
          <View style={profileStyles.goalChips}>
            {state.user.goals.map((goal) => (
              <View key={goal} style={profileStyles.goalChip}>
                <Text style={profileStyles.goalChipText}>{goal}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* Settings sections */}
        <View>
          <Text style={profileStyles.sectionLabel}>Personalization</Text>
          <View style={profileStyles.settingsCard}>
            <SettingsRow
              icon={User}
              label="Personal Info"
              value={state.user.name}
              accent={colors.blue}
              onPress={() => setActiveModal('personal')}
            />
            <View style={profileStyles.settingsDivider} />
            <SettingsRow
              icon={Sliders}
              label="Connected Devices"
              value={`${state.trackingModes.length} Active`}
              accent={colors.lilac}
              onPress={() => navigation.navigate('DeviceIntegrations')}
            />
            <View style={profileStyles.settingsDivider} />
            <SettingsRow
              icon={Bell}
              label="Notifications"
              accent={colors.amber}
              onPress={async () => {
                const { status } = await Notifications.requestPermissionsAsync().catch(() => ({ status: 'denied' as const }));
                if (status !== 'granted') {
                  Alert.alert(
                    'Notifications Disabled',
                    'Enable notifications in your device Settings to receive Aurora health reminders.',
                    [{ text: 'OK' }]
                  );
                  return;
                }
                setActiveModal('notifications');
              }}
            />
          </View>
        </View>

        <View>
          <Text style={profileStyles.sectionLabel}>AI Companion & Display</Text>
          <View style={profileStyles.settingsCard}>
            <SettingsRow
              icon={Sparkles}
              label="AI Preferences"
              value={aiCoachStyle}
              accent={colors.amber}
              onPress={() => setActiveModal('ai')}
            />
            <View style={profileStyles.settingsDivider} />
            <SettingsRow
              icon={Sliders}
              label="Measurement Units"
              value={units}
              accent={colors.blue}
              onPress={() => setActiveModal('units')}
            />
            <View style={profileStyles.settingsDivider} />
            <SettingsRow
              icon={Palette}
              label="Themes"
              value={themeMode}
              accent={colors.emerald}
              onPress={() => setActiveModal('theme')}
            />
            <View style={profileStyles.settingsDivider} />
            <SettingsRow
              icon={Globe}
              label="Language Settings"
              value={lang}
              accent={colors.lilac}
              onPress={() => setActiveModal('language')}
            />
          </View>
        </View>

        <View>
          <Text style={profileStyles.sectionLabel}>Privacy & Compliance</Text>
          <View style={profileStyles.settingsCard}>
            <SettingsRow
              icon={Shield}
              label="Privacy & Security"
              accent={colors.emerald}
              onPress={() => setActiveModal('privacy')}
            />
            <View style={profileStyles.settingsDivider} />
            <SettingsRow
              icon={Database}
              label="Data Export"
              accent={colors.blue}
              onPress={triggerDataExport}
            />
            <View style={profileStyles.settingsDivider} />
            <SettingsRow
              icon={Lock}
              label="Account Management"
              accent={colors.muted}
              onPress={() => setActiveModal('account')}
            />
          </View>
        </View>

        <View>
          <Text style={profileStyles.sectionLabel}>App Administration</Text>
          <View style={profileStyles.settingsCard}>
            <SettingsRow icon={CircleHelp} label="Help & Support" accent={colors.blue} />
            <View style={profileStyles.settingsDivider} />
            <SettingsRow
              icon={RefreshCw}
              label="Reset Demo Data"
              accent={colors.amber}
              onPress={() => {
                Alert.alert(
                  'Confirm Reset',
                  'This will restore all default health histories and clear local changes. Proceed?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reset', style: 'destructive', onPress: resetDemo },
                  ]
                );
              }}
            />
            <View style={profileStyles.settingsDivider} />
            <SettingsRow
              icon={LogOut}
              label="Sign Out"
              onPress={logout}
              destructive
            />
          </View>
        </View>

        {/* App version */}
        <View style={profileStyles.version}>
          <Text style={profileStyles.versionText}>Aurora v1.0 · Premium Health Intelligence</Text>
        </View>
      </ScrollView>

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODALS SECTION */}
      {/* ──────────────────────────────────────────────────────── */}

      {/* Personal Info Modal */}
      <Modal visible={activeModal === 'personal'} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <TouchableOpacity style={modalStyles.backdrop} onPress={() => setActiveModal(null)} activeOpacity={1} />
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Personal Information</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={modalStyles.scrollBody} keyboardShouldPersistTaps="handled">
              <View style={modalStyles.field}>
                <Text style={modalStyles.label}>Full Name</Text>
                <TextInput value={name} onChangeText={setName} style={modalStyles.input} />
              </View>
              <View style={modalStyles.row}>
                <View style={[modalStyles.field, { flex: 1 }]}>
                  <Text style={modalStyles.label}>Age (years)</Text>
                  <TextInput value={age} onChangeText={setAge} keyboardType="numeric" style={modalStyles.input} />
                </View>
                <View style={[modalStyles.field, { flex: 1 }]}>
                  <Text style={modalStyles.label}>Gender</Text>
                  <TextInput value={gender} onChangeText={(v: any) => setGender(v)} style={modalStyles.input} />
                </View>
              </View>
              <View style={modalStyles.row}>
                <View style={[modalStyles.field, { flex: 1 }]}>
                  <Text style={modalStyles.label}>Height (cm)</Text>
                  <TextInput value={height} onChangeText={setHeight} keyboardType="numeric" style={modalStyles.input} />
                </View>
                <View style={[modalStyles.field, { flex: 1 }]}>
                  <Text style={modalStyles.label}>Weight (kg)</Text>
                  <TextInput value={weight} onChangeText={setWeight} keyboardType="numeric" style={modalStyles.input} />
                </View>
              </View>
              <TouchableOpacity onPress={handleSavePersonal} style={[modalStyles.saveBtn, { backgroundColor: colors.blue }]}>
                <Text style={modalStyles.saveBtnText}>Save Personal Settings</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Goals Selection Modal */}
      <Modal visible={activeModal === 'goals'} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <TouchableOpacity style={modalStyles.backdrop} onPress={() => setActiveModal(null)} activeOpacity={1} />
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Select Health Goals</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={modalStyles.body}>
              <Text style={modalStyles.hint}>Select the priority pillars Aurora uses to guide insights.</Text>
              <View style={modalStyles.goalsGrid}>
                {[
                  'Improve Hydration',
                  'Sleep Better',
                  'Build Better Habits',
                  'Eat Healthier',
                  'Improve Energy Levels',
                  'Improve Consistency',
                ].map((g: any) => {
                  const isSelected = state.user.goals.includes(g);
                  return (
                    <TouchableOpacity
                      key={g}
                      onPress={() => toggleGoal(g)}
                      style={[modalStyles.goalItem, isSelected && { borderColor: colors.emerald, backgroundColor: `${colors.emerald}18` }]}
                    >
                      <Target size={14} color={isSelected ? colors.emerald : colors.muted} />
                      <Text style={[modalStyles.goalItemText, isSelected && { color: colors.emerald }]}>{g}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={activeModal === 'notifications'} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <TouchableOpacity style={modalStyles.backdrop} onPress={() => setActiveModal(null)} activeOpacity={1} />
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Notification Settings</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={modalStyles.body}>
              {[
                { key: 'hydrationReminders' as NotificationKey, label: 'Hydration Reminders', desc: 'Alerts to hit your water intake goal' },
                { key: 'sleepReminders' as NotificationKey, label: 'Sleep Reminders', desc: 'Bedtime reminders based on target hours' },
                { key: 'habitReminders' as NotificationKey, label: 'Habit Checks', desc: 'Reminders for uncompleted habits' },
                { key: 'dailyInsights' as NotificationKey, label: 'Daily Insights', desc: 'Alerts when Aurora compiles reports' },
              ].map((item) => {
                const enabled = state.notifications[item.key];
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => toggleNotification(item.key)}
                    style={modalStyles.notifRow}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={modalStyles.notifTitle}>{item.label}</Text>
                      <Text style={modalStyles.notifDesc}>{item.desc}</Text>
                    </View>
                    <View style={[modalStyles.switch, enabled && { backgroundColor: colors.emerald, borderColor: colors.emerald }]}>
                      <View style={[modalStyles.switchThumb, enabled && { transform: [{ translateX: 20 }], backgroundColor: colors.background }]} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Preferences Modal */}
      <Modal visible={activeModal === 'ai'} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <TouchableOpacity style={modalStyles.backdrop} onPress={() => setActiveModal(null)} activeOpacity={1} />
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>AI Companion Settings</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={modalStyles.body}>
              <Text style={modalStyles.hint}>Configure the tone of the Aurora health strategist.</Text>
              {(['Direct', 'Warm', 'Detail-Oriented'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => {
                    setAiCoachStyle(mode);
                    setActiveModal(null);
                  }}
                  style={[modalStyles.selectRow, aiCoachStyle === mode && modalStyles.selectRowActive]}
                >
                  <Text style={[modalStyles.selectText, aiCoachStyle === mode && { color: colors.amber }]}>{mode}</Text>
                  {aiCoachStyle === mode && <Sparkles size={14} color={colors.amber} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Measurement Units Modal */}
      <Modal visible={activeModal === 'units'} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <TouchableOpacity style={modalStyles.backdrop} onPress={() => setActiveModal(null)} activeOpacity={1} />
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Measurement Units</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={modalStyles.body}>
              {(['Metric', 'Imperial'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => {
                    setUnits(mode);
                    setActiveModal(null);
                  }}
                  style={[modalStyles.selectRow, units === mode && modalStyles.selectRowActive]}
                >
                  <Text style={[modalStyles.selectText, units === mode && { color: colors.blue }]}>{mode}</Text>
                  {units === mode && <Check size={14} color={colors.blue} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Themes Modal */}
      <Modal visible={activeModal === 'theme'} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <TouchableOpacity style={modalStyles.backdrop} onPress={() => setActiveModal(null)} activeOpacity={1} />
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Display Theme</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={modalStyles.body}>
              {(['Charcoal', 'Slate', 'OLED'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => {
                    setTheme(mode);
                    setActiveModal(null);
                  }}
                  style={[modalStyles.selectRow, themeMode === mode && modalStyles.selectRowActive]}
                >
                  <Text style={[modalStyles.selectText, themeMode === mode && { color: colors.emerald }]}>{mode}</Text>
                  {themeMode === mode && <Check size={14} color={colors.emerald} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal visible={activeModal === 'language'} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <TouchableOpacity style={modalStyles.backdrop} onPress={() => setActiveModal(null)} activeOpacity={1} />
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Language Preferences</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={modalStyles.body}>
              {(['English', 'Spanish', 'German', 'Japanese'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => {
                    setLang(mode);
                    setActiveModal(null);
                  }}
                  style={[modalStyles.selectRow, lang === mode && modalStyles.selectRowActive]}
                >
                  <Text style={[modalStyles.selectText, lang === mode && { color: colors.lilac }]}>{mode}</Text>
                  {lang === mode && <Check size={14} color={colors.lilac} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy & Security Modal */}
      <Modal visible={activeModal === 'privacy'} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <TouchableOpacity style={modalStyles.backdrop} onPress={() => setActiveModal(null)} activeOpacity={1} />
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Privacy Dashboard</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={modalStyles.body}>
              <View style={modalStyles.infoBlock}>
                <Lock size={16} color={colors.emerald} />
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.infoTitle}>End-to-End Encrypted</Text>
                  <Text style={modalStyles.infoDesc}>Your health metrics are signed and encrypted locally prior to cloud sync.</Text>
                </View>
              </View>
              <View style={[modalStyles.infoBlock, { borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: spacing.md }]}>
                <Shield size={16} color={colors.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.infoTitle}>Secure Sandbox Storage</Text>
                  <Text style={modalStyles.infoDesc}>Data is sandboxed within local Keychain structures preventing external intercepts.</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Management Modal */}
      <Modal visible={activeModal === 'account'} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <TouchableOpacity style={modalStyles.backdrop} onPress={() => setActiveModal(null)} activeOpacity={1} />
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Account Management</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={modalStyles.body}>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Reset Password', 'An authorization token has been dispatched to your verified email.');
                  setActiveModal(null);
                }}
                style={modalStyles.selectRow}
              >
                <Text style={modalStyles.selectText}>Trigger Password Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Delete Account',
                    'This action will permanently wipe profiles, logs, and tokens from our database. This is irreversible.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Wipe & Delete',
                        style: 'destructive',
                        onPress: () => {
                          logout();
                        },
                      },
                    ]
                  );
                }}
                style={[modalStyles.selectRow, { borderBottomWidth: 0 }]}
              >
                <Text style={[modalStyles.selectText, { color: colors.coral }]}>Request Account Deletion</Text>
                <Trash2 size={14} color={colors.coral} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const profileStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 110,
    gap: spacing.xl,
  },
  header: {},
  eyebrow: {
    color: colors.emerald,
    fontSize: type.micro,
    fontWeight: fontWeight.black,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: { color: colors.ink, fontSize: type.display, fontWeight: fontWeight.black, letterSpacing: -0.5 },
  profileCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    ...shadow,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  verifiedText: { color: colors.background, fontSize: 9, fontWeight: fontWeight.black },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { color: colors.ink, fontSize: type.body, fontWeight: fontWeight.black },
  profileEmail: { color: colors.muted, fontSize: type.small, fontWeight: fontWeight.medium },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: colors.amberSoft,
  },
  planText: { color: colors.amber, fontSize: type.micro, fontWeight: fontWeight.black },
  statsRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: 4,
  },
  statDivider: { width: 1, height: 48, backgroundColor: colors.border },
  statVal: { fontSize: type.section, fontWeight: fontWeight.black },
  statLabel: { color: colors.muted, fontSize: type.micro, fontWeight: fontWeight.bold, textAlign: 'center' },
  sleepIcon: { fontSize: 14 },
  goalsCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  goalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.black,
    letterSpacing: -0.2,
    marginBottom: spacing.xs,
  },
  goalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  goalChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: `${colors.emerald}33`,
    backgroundColor: colors.emeraldSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  goalChipText: { color: colors.emerald, fontSize: type.small, fontWeight: fontWeight.bold },
  settingsCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadow,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 58,
  },
  settingsIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: { flex: 1, color: colors.ink, fontSize: type.body, fontWeight: fontWeight.bold },
  settingsValue: { color: colors.muted, fontSize: type.small, fontWeight: fontWeight.bold },
  settingsDivider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.xl + 34 + spacing.md },
  version: { alignItems: 'center', paddingVertical: spacing.md },
  versionText: { color: colors.subtle, fontSize: type.micro, fontWeight: fontWeight.bold },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: colors.ink, fontSize: type.section, fontWeight: fontWeight.black },
  body: { gap: spacing.md },
  scrollBody: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  field: { gap: spacing.sm },
  label: { color: colors.inkSoft, fontSize: type.small, fontWeight: fontWeight.bold },
  input: {
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
  hint: {
    color: colors.muted,
    fontSize: type.small,
    lineHeight: 18,
  },
  saveBtn: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  saveBtnText: { color: colors.background, fontSize: type.body, fontWeight: fontWeight.black },

  // Goals Select
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  goalItemText: { color: colors.muted, fontSize: type.small, fontWeight: fontWeight.bold },

  // Notif rows
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingVertical: spacing.md,
  },
  notifTitle: { color: colors.ink, fontSize: type.body, fontWeight: fontWeight.bold },
  notifDesc: { color: colors.muted, fontSize: type.small, marginTop: 2 },
  switch: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 3,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.muted,
  },

  // Select list
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  selectRowActive: { borderColor: 'transparent' },
  selectText: { color: colors.ink, fontSize: type.body, fontWeight: fontWeight.semibold },

  // Info Block
  infoBlock: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  infoTitle: { color: colors.ink, fontSize: type.body, fontWeight: fontWeight.bold },
  infoDesc: { color: colors.muted, fontSize: type.small, lineHeight: 18, marginTop: 2 },
});
