import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  ListChecks,
  Pause,
  Pencil,
  Play,
  Plus,
  SkipForward,
  Trash2,
  X,
} from 'lucide-react-native';

import { CircularProgress } from '../components/visuals';
import { useHealth } from '../store/HealthContext';
import { Habit, HabitPeriod } from '../types/health';
import { colors, fontWeight, radius, shadow, spacing, type } from '../theme/tokens';

const PERIODS: HabitPeriod[] = ['Morning', 'Afternoon', 'Evening', 'Anytime'];
const CADENCES = ['Daily', 'Weekdays', 'Weekends'];
const EMOJIS = ['⭐', '🚶', '🧘', '📚', '🤸', '💪', '🥗', '💧', '🌙', '🏃', '🎯', '✍️', '🧹', '🎨', '🏋️', '🍎'];
const PALETTE = [colors.emerald, colors.blue, colors.lilac, colors.amber, colors.coral];

// ─── Helpers ─────────────────────────────────────────────────
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildWeek(): Date[] {
  const today = new Date();
  const days: Date[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Week Strip ───────────────────────────────────────────────
function WeekDayStrip({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const days = buildWeek();
  const today = todayKey();
  return (
    <View style={s.weekStrip}>
      {days.map((d) => {
        const key = toDateKey(d);
        const isToday = key === today;
        const isSelected = key === selectedDate;
        const isFuture = key > today;
        const dayLabel = d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 3).toUpperCase();
        const dayNum = d.getDate();
        return (
          <TouchableOpacity
            key={key}
            onPress={() => !isFuture && onSelectDate(key)}
            disabled={isFuture}
            style={s.dayItem}
            accessibilityLabel={`${dayLabel} ${dayNum}`}
          >
            <Text style={[s.dayLabel, isFuture && { opacity: 0.3 }]}>{dayLabel}</Text>
            <View style={[
              s.dayNumWrap,
              isToday && !isSelected && s.dayNumWrapToday,
              isSelected && s.dayNumWrapActive,
              isFuture && { opacity: 0.3 },
            ]}>
              <Text style={[
                s.dayNum,
                isToday && !isSelected && s.dayNumToday,
                isSelected && s.dayNumActive,
              ]}>
                {dayNum}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Habit Action Sheet ───────────────────────────────────────
function HabitActionSheet({
  habit,
  isToday,
  onClose,
  onComplete,
  onSkip,
  onPause,
  onEdit,
  onDelete,
}: {
  habit: Habit;
  isToday: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onPause: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const canComplete = isToday && !habit.completedToday && !habit.paused;
  const canSkip = isToday && !habit.completedToday && !habit.skippedToday && !habit.paused;

  return (
    <View style={s.modalOverlay}>
      <TouchableOpacity style={s.modalBackdrop} onPress={onClose} activeOpacity={1} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />

        {/* Habit identity */}
        <View style={s.sheetHabitRow}>
          <View style={[s.sheetEmojiBg, { backgroundColor: `${habit.color || colors.emerald}18` }]}>
            <Text style={s.sheetEmoji}>{habit.emoji || '⭐'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sheetHabitTitle}>{habit.title}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center', marginTop: 3 }}>
              <View style={[s.periodPill, { backgroundColor: `${habit.color || colors.emerald}18` }]}>
                <Text style={[s.periodPillText, { color: habit.color || colors.emerald }]}>{habit.period}</Text>
              </View>
              <Text style={s.sheetCadence}>{habit.cadence}</Text>
              {habit.streak > 0 && (
                <>
                  <Flame size={11} color={colors.amber} strokeWidth={2} />
                  <Text style={s.sheetStreak}>{habit.streak}d streak</Text>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
            <X size={18} color={colors.muted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={s.sheetDivider} />

        {/* Actions */}
        {canComplete && (
          <TouchableOpacity style={s.sheetAction} onPress={onComplete} accessibilityLabel="Complete">
            <View style={[s.sheetActionIcon, { backgroundColor: `${colors.emerald}18` }]}>
              <Check size={16} color={colors.emerald} strokeWidth={2.5} />
            </View>
            <Text style={[s.sheetActionLabel, { color: colors.emerald }]}>Mark Complete</Text>
          </TouchableOpacity>
        )}

        {canSkip && (
          <TouchableOpacity style={s.sheetAction} onPress={onSkip} accessibilityLabel="Skip today">
            <View style={[s.sheetActionIcon, { backgroundColor: `${colors.amber}18` }]}>
              <SkipForward size={16} color={colors.amber} strokeWidth={2} />
            </View>
            <Text style={s.sheetActionLabel}>Skip Today</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.sheetAction} onPress={onPause} accessibilityLabel={habit.paused ? 'Resume' : 'Pause'}>
          <View style={[s.sheetActionIcon, { backgroundColor: `${colors.blue}18` }]}>
            {habit.paused
              ? <Play size={16} color={colors.blue} strokeWidth={2} />
              : <Pause size={16} color={colors.blue} strokeWidth={2} />
            }
          </View>
          <Text style={s.sheetActionLabel}>{habit.paused ? 'Resume Habit' : 'Pause Habit'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.sheetAction} onPress={onEdit} accessibilityLabel="Edit">
          <View style={[s.sheetActionIcon, { backgroundColor: `${colors.lilac}18` }]}>
            <Pencil size={16} color={colors.lilac} strokeWidth={2} />
          </View>
          <Text style={s.sheetActionLabel}>Edit Habit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.sheetAction, { borderBottomWidth: 0 }]} onPress={onDelete} accessibilityLabel="Delete">
          <View style={[s.sheetActionIcon, { backgroundColor: `${colors.coral}18` }]}>
            <Trash2 size={16} color={colors.coral} strokeWidth={2} />
          </View>
          <Text style={[s.sheetActionLabel, { color: colors.coral }]}>Delete Habit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Create / Edit Form ───────────────────────────────────────
function HabitForm({
  initial,
  title: formTitle,
  onSubmit,
  onClose,
}: {
  initial?: Partial<Habit>;
  title: string;
  onSubmit: (values: { title: string; period: HabitPeriod; cadence: string; emoji: string; color: string }) => void;
  onClose: () => void;
}) {
  const [habitTitle, setHabitTitle] = useState(initial?.title ?? '');
  const [period, setPeriod] = useState<HabitPeriod>(initial?.period ?? 'Morning');
  const [cadence, setCadence] = useState(initial?.cadence ?? 'Daily');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '⭐');
  const [color, setColor] = useState(initial?.color ?? colors.emerald);

  const valid = habitTitle.trim().length > 0;

  return (
    <View style={s.modalOverlay}>
      <TouchableOpacity style={s.modalBackdrop} onPress={onClose} activeOpacity={1} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>{formTitle}</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
            <X size={18} color={colors.muted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={s.formField}>
            <Text style={s.formLabel}>Habit name</Text>
            <TextInput
              value={habitTitle}
              onChangeText={setHabitTitle}
              placeholder="e.g. Morning walk"
              placeholderTextColor={colors.subtle}
              style={s.formInput}
              autoFocus={!initial}
            />
          </View>

          {/* Period */}
          <View style={s.formField}>
            <Text style={s.formLabel}>Time of day</Text>
            <View style={s.chipRow}>
              {PERIODS.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[s.chip, period === p && s.chipActive]}
                  accessibilityLabel={p}
                >
                  <Text style={[s.chipText, period === p && s.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cadence */}
          <View style={s.formField}>
            <Text style={s.formLabel}>Frequency</Text>
            <View style={s.chipRow}>
              {CADENCES.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCadence(c)}
                  style={[s.chip, cadence === c && s.chipActive]}
                  accessibilityLabel={c}
                >
                  <Text style={[s.chipText, cadence === c && s.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Emoji */}
          <View style={s.formField}>
            <Text style={s.formLabel}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setEmoji(e)}
                  style={[s.emojiBtn, emoji === e && s.emojiBtnActive]}
                  accessibilityLabel={e}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Color */}
          <View style={s.formField}>
            <Text style={s.formLabel}>Color</Text>
            <View style={s.chipRow}>
              {PALETTE.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[s.colorBtn, { backgroundColor: c }, color === c && s.colorBtnActive]}
                  accessibilityLabel={c}
                />
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={() => valid && onSubmit({ title: habitTitle.trim(), period, cadence, emoji, color })}
            disabled={!valid}
            style={[s.submitBtn, !valid && { opacity: 0.4 }]}
            accessibilityLabel={formTitle}
          >
            <Text style={s.submitBtnText}>{formTitle}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export function HabitsScreen() {
  const { state, completeHabit, skipHabit, pauseHabit, deleteHabit, createHabit, updateHabit } = useHealth();
  const navigation = useNavigation<any>();

  const [filter, setFilter] = useState<HabitPeriod | 'All'>('All');
  const [selectedDate, setSelectedDate] = useState(todayKey());

  // Sheet / modal state
  const [sheetHabit, setSheetHabit] = useState<Habit | null>(null);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const isToday = selectedDate === todayKey();

  const activeHabits = state.habits.filter((h) => !h.paused);
  const completed = activeHabits.filter((h) => h.completedToday).length;
  const habitPct = activeHabits.length ? Math.round((completed / activeHabits.length) * 100) : 0;
  const totalStreak = state.habits.reduce((acc, h) => acc + h.streak, 0);
  const longestStreak = Math.max(...state.habits.map((h) => h.longestStreak), 0);

  const filteredHabits = useMemo(() => {
    const habits = filter === 'All' ? state.habits : state.habits.filter((h) => h.period === filter);
    if (isToday) {
      return [...habits].sort((a, b) => {
        if (a.completedToday && !b.completedToday) return 1;
        if (!a.completedToday && b.completedToday) return -1;
        return 0;
      });
    }
    return [...habits].sort((a, b) => {
      const aDone = (a.completionDates ?? []).includes(selectedDate);
      const bDone = (b.completionDates ?? []).includes(selectedDate);
      if (aDone && !bDone) return -1;
      if (!aDone && bDone) return 1;
      return 0;
    });
  }, [state.habits, filter, isToday, selectedDate]);

  const dateCompleted = isToday
    ? completed
    : state.habits.filter((h) => (h.completionDates ?? []).includes(selectedDate)).length;
  const datePct = state.habits.length ? Math.round((dateCompleted / state.habits.length) * 100) : 0;

  const openSheet = (habit: Habit) => setSheetHabit(habit);

  const closeSheet = () => setSheetHabit(null);

  const handleComplete = (id: string) => {
    completeHabit(id);
    closeSheet();
  };

  const handleSkip = (id: string) => {
    skipHabit(id);
    closeSheet();
  };

  const handlePause = (id: string) => {
    pauseHabit(id);
    closeSheet();
  };

  const handleOpenEdit = (habit: Habit) => {
    setSheetHabit(null);
    setEditHabit(habit);
  };

  const handleEdit = (id: string, values: { title: string; period: HabitPeriod; cadence: string; emoji: string; color: string }) => {
    updateHabit(id, values);
    setEditHabit(null);
  };

  const handleCreate = (values: { title: string; period: HabitPeriod; cadence: string; emoji: string; color: string }) => {
    createHabit(values.title, values.period, values.cadence, values.emoji, values.color);
    setShowCreate(false);
  };

  const handleDelete = (habit: Habit) => {
    closeSheet();
    Alert.alert(
      'Delete Habit',
      `Delete "${habit.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habit.id) },
      ]
    );
  };

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} accessibilityLabel="Back">
            <ChevronLeft size={20} color={colors.ink} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Habits</Text>
          <TouchableOpacity onPress={() => setShowCreate(true)} style={s.iconBtn} accessibilityLabel="Add habit">
            <Plus size={18} color={colors.emerald} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Week strip */}
        <WeekDayStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {/* History banner */}
        {!isToday && (
          <View style={s.historyBanner}>
            <Text style={s.historyBannerText}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })} — view only
            </Text>
            <TouchableOpacity onPress={() => setSelectedDate(todayKey())} accessibilityLabel="Go to today">
              <Text style={s.historyLink}>Today →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Progress summary */}
        <View style={s.summaryCard}>
          <View style={s.summaryRing}>
            <CircularProgress progress={isToday ? habitPct : datePct} color={colors.emerald} size={80} strokeWidth={7} />
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={s.summaryPct}>{isToday ? habitPct : datePct}%</Text>
            </View>
          </View>
          <View style={s.summaryInfo}>
            <Text style={s.summaryHeadline}>
              {dateCompleted}/{isToday ? activeHabits.length : state.habits.length} Habits {isToday ? 'Completed' : 'Done'}
            </Text>
            <Text style={s.summarySubline}>
              {isToday
                ? activeHabits.length - completed > 0
                  ? `${activeHabits.length - completed} left for today`
                  : 'All done for today!'
                : `${dateCompleted} completed on this day`}
            </Text>
            <View style={s.summaryMeta}>
              <View style={s.metaChip}>
                <Flame size={12} color={colors.amber} strokeWidth={2} />
                <Text style={s.metaChipText}>{totalStreak} total streak</Text>
              </View>
              <View style={s.metaChip}>
                <ListChecks size={12} color={colors.emerald} strokeWidth={2} />
                <Text style={s.metaChipText}>{longestStreak}d best</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Period filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {(['All', ...PERIODS] as (HabitPeriod | 'All')[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[s.filterChip, filter === f && s.filterChipActive]}
              accessibilityLabel={f}
            >
              <Text style={[s.filterChipText, filter === f && s.filterChipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Habit list */}
        <View style={s.habitList}>
          {filteredHabits.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 40 }}>⭐</Text>
              <Text style={s.emptyTitle}>No habits here</Text>
              <Text style={s.emptySubtitle}>Tap + to create your first habit</Text>
            </View>
          ) : (
            filteredHabits.map((habit) => {
              const doneOnDate = isToday
                ? habit.completedToday
                : (habit.completionDates ?? []).includes(selectedDate);
              const skipped = isToday && habit.skippedToday;

              return (
                <TouchableOpacity
                  key={habit.id}
                  onPress={() => openSheet(habit)}
                  activeOpacity={0.75}
                  style={[
                    s.habitCard,
                    habit.paused && s.habitCardPaused,
                    doneOnDate && { borderColor: `${habit.color || colors.emerald}40` },
                    skipped && { borderColor: `${colors.amber}40` },
                  ]}
                  accessibilityLabel={`${habit.title}, tap to manage`}
                >
                  {/* Checkbox */}
                  <View style={[
                    s.checkbox,
                    doneOnDate && { backgroundColor: habit.color || colors.emerald, borderColor: habit.color || colors.emerald },
                    skipped && { backgroundColor: colors.amberSoft, borderColor: colors.amber },
                  ]}>
                    {doneOnDate && <Check size={13} color={colors.background} strokeWidth={2.5} />}
                    {skipped && <Text style={{ fontSize: 9 }}>–</Text>}
                  </View>

                  <Text style={s.habitEmoji}>{habit.emoji || '⭐'}</Text>

                  <View style={s.habitContent}>
                    <Text style={[
                      s.habitTitle,
                      doneOnDate && s.habitTitleDone,
                      habit.paused && { color: colors.muted },
                    ]}>
                      {habit.title}
                    </Text>
                    <View style={s.habitMeta}>
                      <View style={[s.periodPill, { backgroundColor: `${habit.color || colors.emerald}18` }]}>
                        <Text style={[s.periodPillText, { color: habit.color || colors.emerald }]}>{habit.period}</Text>
                      </View>
                      <Text style={s.cadenceText}>{habit.cadence}</Text>
                      {habit.paused && (
                        <View style={s.statusBadge}>
                          <Text style={[s.statusBadgeText, { color: colors.muted }]}>Paused</Text>
                        </View>
                      )}
                      {skipped && (
                        <View style={[s.statusBadge, { backgroundColor: colors.amberSoft }]}>
                          <Text style={[s.statusBadgeText, { color: colors.amber }]}>Skipped</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={s.rowRight}>
                    {habit.streak > 0 && (
                      <View style={s.streakWrap}>
                        <Flame size={12} color={colors.amber} strokeWidth={2} />
                        <Text style={s.streakText}>{habit.streak}d</Text>
                      </View>
                    )}
                    <ChevronRight size={16} color={colors.subtle} strokeWidth={2} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Tip */}
        <View style={s.tipCard}>
          <Text style={s.tipTitle}>💡 Aurora Suggests</Text>
          <Text style={s.tipText}>
            Morning habits are completed 3× more consistently. Consider moving evening habits to the morning window.
          </Text>
        </View>
      </ScrollView>

      {/* ── Action Sheet ── */}
      <Modal
        visible={!!sheetHabit}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        {sheetHabit && (
          <HabitActionSheet
            habit={sheetHabit}
            isToday={isToday}
            onClose={closeSheet}
            onComplete={() => handleComplete(sheetHabit.id)}
            onSkip={() => handleSkip(sheetHabit.id)}
            onPause={() => handlePause(sheetHabit.id)}
            onEdit={() => handleOpenEdit(sheetHabit)}
            onDelete={() => handleDelete(sheetHabit)}
          />
        )}
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        visible={!!editHabit}
        transparent
        animationType="slide"
        onRequestClose={() => setEditHabit(null)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {editHabit && (
          <HabitForm
            title="Save Changes"
            initial={editHabit}
            onSubmit={(values) => handleEdit(editHabit.id, values)}
            onClose={() => setEditHabit(null)}
          />
        )}
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Create Modal ── */}
      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <HabitForm
          title="Create Habit"
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 110, gap: spacing.xl },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: colors.ink, fontSize: type.body + 2, fontWeight: fontWeight.black },

  // Week strip
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  dayItem: { flex: 1, alignItems: 'center', gap: 6 },
  dayLabel: { color: colors.muted, fontSize: type.micro, fontWeight: fontWeight.bold, textTransform: 'uppercase' },
  dayNumWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayNumWrapToday: { borderWidth: 1, borderColor: colors.emerald },
  dayNumWrapActive: { backgroundColor: colors.emerald },
  dayNum: { color: colors.ink, fontSize: type.small, fontWeight: fontWeight.bold },
  dayNumToday: { color: colors.emerald, fontWeight: fontWeight.black },
  dayNumActive: { color: colors.background, fontWeight: fontWeight.black },

  // History banner
  historyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.amberSoft, borderRadius: radius.sm,
    borderWidth: 1, borderColor: `${colors.amber}33`,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  historyBannerText: { color: colors.amber, fontSize: type.small, fontWeight: fontWeight.bold, flex: 1 },
  historyLink: { color: colors.amber, fontSize: type.small, fontWeight: fontWeight.black },

  // Summary
  summaryCard: {
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg, ...shadow,
  },
  summaryRing: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  summaryPct: { color: colors.emerald, fontSize: type.small, fontWeight: fontWeight.black },
  summaryInfo: { flex: 1, gap: spacing.xs },
  summaryHeadline: { color: colors.ink, fontSize: type.body, fontWeight: fontWeight.black },
  summarySubline: { color: colors.muted, fontSize: type.small },
  summaryMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface2, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  metaChipText: { color: colors.muted, fontSize: type.micro, fontWeight: fontWeight.bold },

  // Filter
  filterRow: { gap: spacing.sm, paddingRight: spacing.lg },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.full, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.emeraldSoft, borderColor: colors.emerald },
  filterChipText: { color: colors.muted, fontSize: type.small, fontWeight: fontWeight.extrabold },
  filterChipTextActive: { color: colors.emerald },

  // Habit list
  habitList: { gap: spacing.sm },
  habitCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: spacing.md, ...shadow,
  },
  habitCardPaused: { opacity: 0.55 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  habitEmoji: { fontSize: 18 },
  habitContent: { flex: 1, gap: 3 },
  habitTitle: { color: colors.ink, fontSize: type.body, fontWeight: fontWeight.bold },
  habitTitleDone: { color: colors.muted, textDecorationLine: 'line-through' },
  habitMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  periodPill: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  periodPillText: { fontSize: type.micro, fontWeight: fontWeight.extrabold },
  cadenceText: { color: colors.subtle, fontSize: type.micro, fontWeight: fontWeight.bold },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.surface2 },
  statusBadgeText: { fontSize: type.micro, fontWeight: fontWeight.extrabold },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  streakWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streakText: { color: colors.amber, fontSize: type.small, fontWeight: fontWeight.extrabold },

  // Empty
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxxl },
  emptyTitle: { color: colors.ink, fontSize: type.body, fontWeight: fontWeight.black },
  emptySubtitle: { color: colors.muted, fontSize: type.small },

  // Tip
  tipCard: {
    borderRadius: radius.md, borderWidth: 1, borderColor: `${colors.amber}33`,
    backgroundColor: colors.amberSoft, padding: spacing.lg, gap: spacing.xs,
  },
  tipTitle: { color: colors.amber, fontSize: type.small, fontWeight: fontWeight.black },
  tipText: { color: colors.inkSoft, fontSize: type.small, lineHeight: 20 },

  // Modal / sheet shared
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderTopWidth: 1, borderColor: colors.border,
    padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.xs,
  },

  // Action sheet
  sheetHabitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sheetEmojiBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetEmoji: { fontSize: 24 },
  sheetHabitTitle: { color: colors.ink, fontSize: type.body, fontWeight: fontWeight.black },
  sheetCadence: { color: colors.subtle, fontSize: type.micro, fontWeight: fontWeight.bold },
  sheetStreak: { color: colors.amber, fontSize: type.micro, fontWeight: fontWeight.extrabold },
  sheetDivider: { height: 1, backgroundColor: colors.border },
  sheetAction: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  sheetActionIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  sheetActionLabel: { color: colors.ink, fontSize: type.body, fontWeight: fontWeight.semibold, flex: 1 },

  // Form
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: colors.ink, fontSize: type.section, fontWeight: fontWeight.black },
  formField: { gap: spacing.sm },
  formLabel: { color: colors.inkSoft, fontSize: type.small, fontWeight: fontWeight.bold },
  formInput: {
    minHeight: 52, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface2,
    paddingHorizontal: spacing.lg, color: colors.ink,
    fontSize: type.body, fontWeight: fontWeight.semibold,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.full, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface2,
  },
  chipActive: { backgroundColor: colors.emeraldSoft, borderColor: colors.emerald },
  chipText: { color: colors.muted, fontSize: type.small, fontWeight: fontWeight.bold },
  chipTextActive: { color: colors.emerald },
  emojiBtn: {
    width: 44, height: 44, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
  },
  emojiBtnActive: { borderColor: colors.emerald, backgroundColor: colors.emeraldSoft },
  colorBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  colorBtnActive: { borderColor: colors.ink },
  submitBtn: {
    minHeight: 52, borderRadius: radius.md,
    backgroundColor: colors.emerald, alignItems: 'center', justifyContent: 'center',
  },
  submitBtnText: { color: colors.background, fontSize: type.body, fontWeight: fontWeight.black },
});
