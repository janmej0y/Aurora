/**
 * Aurora Health Cards — Rich inline chat components.
 *
 * Every card receives ONLY the pre-computed values it needs to render.
 * All database reads happen BEFORE the card is created (in CompanionScreen
 * via buildMinimalContext / server response). Cards are purely presentational.
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors, fontWeight, radius, spacing, type } from '../theme/tokens';
import { Droplets, Moon, Target, Flame, Zap, TrendingUp, CheckCircle2, Apple, Brain } from 'lucide-react-native';

// ─── Shared primitives ────────────────────────────────────────────

function CardShell({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[sh.card, style]}>{children}</View>;
}

function CardLabel({ label, color }: { label: string; color?: string }) {
  return (
    <Text style={[sh.sectionLabel, color ? { color } : null]}>{label.toUpperCase()}</Text>
  );
}

function MetricPill({ value, unit, color }: { value: string | number; unit?: string; color: string }) {
  return (
    <View style={[sh.pill, { backgroundColor: color + '18' }]}>
      <Text style={[sh.pillValue, { color }]}>{value}</Text>
      {unit ? <Text style={[sh.pillUnit, { color: color + 'AA' }]}>{unit}</Text> : null}
    </View>
  );
}

// Circular arc progress — gradient ID is unique per instance to avoid
// Android react-native-svg global registry collisions when the same
// card type appears multiple times in the chat scroll view.
function ArcProgress({ pct, size, color, strokeWidth = 6 }: {
  pct: number; size: number; color: string; strokeWidth?: number;
}) {
  // Stable per-instance ID that survives re-renders but is unique across instances
  const gradId = useRef(`arc_${Math.random().toString(36).slice(2, 9)}`).current;
  const r      = (size - strokeWidth) / 2;
  const circ   = 2 * Math.PI * r;
  const dash   = Math.min(pct / 100, 1) * circ;
  const cx     = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <SvgLinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={color} stopOpacity="1" />
        </SvgLinearGradient>
      </Defs>
      {/* Track */}
      <Circle cx={cx} cy={cx} r={r} fill="none" stroke={color + '22'} strokeWidth={strokeWidth} />
      {/* Progress */}
      <Circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
      />
    </Svg>
  );
}

// Thin bar progress
function BarProgress({ pct, color, height = 4 }: { pct: number; color: string; height?: number }) {
  return (
    <View style={[sh.barTrack, { height }]}>
      <View style={[sh.barFill, { width: `${Math.min(pct, 100)}%` as `${number}%`, backgroundColor: color, height }]} />
    </View>
  );
}

// ─── HealthSummaryCard ─────────────────────────────────────────────

export type HealthSummaryData = {
  hydrationPct: number;
  hydrationMl: number;
  hydrationGoalMl: number;
  sleepHours: number;
  sleepGoalHours: number;
  sleepQuality?: string;
  habitsCompleted: number;
  habitsTotal: number;
  consistencyPct: number;
  streaks: number;
  focusArea?: string;
};

export function HealthSummaryCard({ data }: { data: HealthSummaryData }) {
  const {
    hydrationPct, hydrationMl, hydrationGoalMl,
    sleepHours, habitsCompleted, habitsTotal,
    consistencyPct, streaks, focusArea,
  } = data;

  const items = [
    { icon: <Droplets size={14} color={colors.blue} strokeWidth={2.5} />,  label: 'Hydration', value: `${Math.round(hydrationPct)}%`, sub: `${(hydrationMl / 1000).toFixed(1)}L / ${(hydrationGoalMl / 1000).toFixed(1)}L`, color: colors.blue },
    { icon: <Moon      size={14} color={colors.lilac} strokeWidth={2.5} />, label: 'Sleep',     value: `${sleepHours.toFixed(1)}h`,  sub: sleepHours >= 7 ? 'On track' : 'Below goal', color: colors.lilac },
    { icon: <Target    size={14} color={colors.emerald} strokeWidth={2.5} />, label: 'Habits',  value: `${habitsCompleted}/${habitsTotal}`, sub: 'Today',     color: colors.emerald },
    { icon: <TrendingUp size={14} color={colors.amber} strokeWidth={2.5} />, label: 'Streak',  value: `${streaks}d`,               sub: 'Active',       color: colors.amber },
  ];

  return (
    <CardShell>
      <View style={sh.cardHeader}>
        <CardLabel label="Health Summary" />
        <View style={[sh.badgePill, { backgroundColor: colors.emeraldSoft }]}>
          <Text style={[sh.badgeText, { color: colors.emerald }]}>Today</Text>
        </View>
      </View>

      {/* 2×2 metric grid */}
      <View style={sh.grid2x2}>
        {items.map((it) => (
          <View key={it.label} style={[sh.gridCell, { borderColor: it.color + '22' }]}>
            <View style={sh.cellIconRow}>
              {it.icon}
              <Text style={sh.cellLabel}>{it.label}</Text>
            </View>
            <Text style={[sh.cellValue, { color: it.color }]}>{it.value}</Text>
            <Text style={sh.cellSub}>{it.sub}</Text>
          </View>
        ))}
      </View>

      {/* Consistency bar */}
      <View style={sh.consistencyRow}>
        <View style={{ flex: 1 }}>
          <View style={sh.consistencyLabelRow}>
            <Text style={sh.cellLabel}>Consistency</Text>
            <Text style={[sh.cellValue, { color: consistencyPct >= 70 ? colors.emerald : colors.amber, fontSize: type.small }]}>{Math.round(consistencyPct)}%</Text>
          </View>
          <BarProgress pct={consistencyPct} color={consistencyPct >= 70 ? colors.emerald : colors.amber} height={5} />
        </View>
      </View>

      {focusArea && (
        <View style={sh.focusRow}>
          <Zap size={12} color={colors.amber} strokeWidth={2.5} />
          <Text style={sh.focusText}>Focus: <Text style={{ color: colors.amber }}>{focusArea}</Text></Text>
        </View>
      )}
    </CardShell>
  );
}

// ─── HydrationCard ─────────────────────────────────────────────────

export type HydrationCardData = {
  currentMl: number;
  goalMl: number;
  addedMl?: number;
};

export function HydrationCard({ data }: { data: HydrationCardData }) {
  const { currentMl, goalMl, addedMl } = data;
  const pct       = goalMl > 0 ? Math.round((currentMl / goalMl) * 100) : 0;
  const remaining = Math.max(0, goalMl - currentMl);

  return (
    <CardShell>
      <View style={sh.cardHeader}>
        <View style={sh.cellIconRow}>
          <Droplets size={16} color={colors.blue} strokeWidth={2.5} />
          <CardLabel label="Hydration" color={colors.blue} />
        </View>
        {addedMl && (
          <View style={[sh.badgePill, { backgroundColor: colors.blueSoft }]}>
            <Text style={[sh.badgeText, { color: colors.blue }]}>+{addedMl}ml added</Text>
          </View>
        )}
      </View>

      <View style={sh.arcRow}>
        <View style={sh.arcWrap}>
          <ArcProgress pct={pct} size={80} color={colors.blue} strokeWidth={7} />
          <View style={sh.arcCenter}>
            <Text style={[sh.arcPct, { color: colors.blue }]}>{pct}%</Text>
          </View>
        </View>

        <View style={sh.arcStats}>
          <View style={sh.arcStatRow}>
            <Text style={sh.cellLabel}>Current</Text>
            <Text style={[sh.statValue, { color: colors.ink }]}>{(currentMl / 1000).toFixed(2)}L</Text>
          </View>
          <View style={[sh.statDivider, { backgroundColor: colors.border }]} />
          <View style={sh.arcStatRow}>
            <Text style={sh.cellLabel}>Goal</Text>
            <Text style={[sh.statValue, { color: colors.inkSoft }]}>{(goalMl / 1000).toFixed(1)}L</Text>
          </View>
          <View style={[sh.statDivider, { backgroundColor: colors.border }]} />
          <View style={sh.arcStatRow}>
            <Text style={sh.cellLabel}>Remaining</Text>
            <Text style={[sh.statValue, { color: remaining === 0 ? colors.emerald : colors.inkSoft }]}>
              {remaining === 0 ? 'Done ✓' : `${remaining}ml`}
            </Text>
          </View>
        </View>
      </View>

      <BarProgress pct={pct} color={colors.blue} height={4} />
    </CardShell>
  );
}

// ─── SleepCard ─────────────────────────────────────────────────────

export type SleepCardData = {
  hours: number;
  bedtime?: string;
  wakeTime?: string;
  quality?: string;
  weeklyAvg?: number;
};

export function SleepCard({ data }: { data: SleepCardData }) {
  const { hours, bedtime, wakeTime, quality, weeklyAvg } = data;
  const goalHours = 8;
  const pct       = Math.round((hours / goalHours) * 100);
  const qualColor = quality === 'Excellent' ? colors.emerald
                  : quality === 'Good'      ? colors.blue
                  : quality === 'Fair'      ? colors.amber
                  : colors.coral;

  return (
    <CardShell>
      <View style={sh.cardHeader}>
        <View style={sh.cellIconRow}>
          <Moon size={16} color={colors.lilac} strokeWidth={2.5} />
          <CardLabel label="Sleep" color={colors.lilac} />
        </View>
        {quality && (
          <View style={[sh.badgePill, { backgroundColor: qualColor + '22' }]}>
            <Text style={[sh.badgeText, { color: qualColor }]}>{quality}</Text>
          </View>
        )}
      </View>

      <View style={sh.arcRow}>
        <View style={sh.arcWrap}>
          <ArcProgress pct={pct} size={80} color={colors.lilac} strokeWidth={7} />
          <View style={sh.arcCenter}>
            <Text style={[sh.arcPct, { color: colors.lilac }]}>{hours.toFixed(1)}</Text>
            <Text style={[sh.arcPctUnit, { color: colors.lilac + 'AA' }]}>hrs</Text>
          </View>
        </View>

        <View style={sh.arcStats}>
          {bedtime && (
            <View style={sh.arcStatRow}>
              <Text style={sh.cellLabel}>Bedtime</Text>
              <Text style={[sh.statValue, { color: colors.ink }]}>{bedtime}</Text>
            </View>
          )}
          {wakeTime && (
            <>
              <View style={[sh.statDivider, { backgroundColor: colors.border }]} />
              <View style={sh.arcStatRow}>
                <Text style={sh.cellLabel}>Wake</Text>
                <Text style={[sh.statValue, { color: colors.ink }]}>{wakeTime}</Text>
              </View>
            </>
          )}
          {weeklyAvg !== undefined && (
            <>
              <View style={[sh.statDivider, { backgroundColor: colors.border }]} />
              <View style={sh.arcStatRow}>
                <Text style={sh.cellLabel}>7-day avg</Text>
                <Text style={[sh.statValue, { color: colors.inkSoft }]}>{weeklyAvg.toFixed(1)}h</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <BarProgress pct={pct} color={colors.lilac} height={4} />
    </CardShell>
  );
}

// ─── HabitProgressCard ─────────────────────────────────────────────

export type HabitItem = {
  id: string; title: string; emoji?: string; color?: string;
  completedToday: boolean; streak: number;
};

export type HabitProgressCardData = {
  habits: HabitItem[];
  newHabit?: string;
};

export function HabitProgressCard({ data }: { data: HabitProgressCardData }) {
  const { habits, newHabit } = data;
  const active    = habits.filter(h => !('paused' in h && (h as { paused?: boolean }).paused));
  const completed = active.filter(h => h.completedToday).length;
  const pct       = active.length > 0 ? Math.round((completed / active.length) * 100) : 0;

  return (
    <CardShell>
      <View style={sh.cardHeader}>
        <View style={sh.cellIconRow}>
          <Target size={16} color={colors.emerald} strokeWidth={2.5} />
          <CardLabel label={newHabit ? 'Habit Created' : 'Habits'} color={colors.emerald} />
        </View>
        <MetricPill value={`${completed}/${active.length}`} color={colors.emerald} />
      </View>

      {newHabit && (
        <View style={[sh.newHabitRow, { backgroundColor: colors.emeraldSoft, borderColor: colors.emeraldGlow }]}>
          <CheckCircle2 size={14} color={colors.emerald} strokeWidth={2.5} />
          <Text style={[sh.newHabitText, { color: colors.emerald }]}>{newHabit}</Text>
        </View>
      )}

      <View style={sh.habitList}>
        {active.slice(0, 5).map((h) => (
          <View key={h.id} style={sh.habitRow}>
            <View style={sh.habitLeft}>
              <Text style={sh.habitEmoji}>{h.emoji ?? '⭐'}</Text>
              <Text style={[sh.habitTitle, h.completedToday && { color: colors.inkSoft }]}>{h.title}</Text>
            </View>
            <View style={sh.habitRight}>
              {h.streak > 0 && (
                <View style={sh.streakBadge}>
                  <Flame size={10} color={colors.amber} strokeWidth={2.5} />
                  <Text style={sh.streakNum}>{h.streak}</Text>
                </View>
              )}
              <View style={[sh.habitDot, { backgroundColor: h.completedToday ? colors.emerald : colors.surface3 }]} />
            </View>
          </View>
        ))}
      </View>

      <BarProgress pct={pct} color={colors.emerald} height={4} />
    </CardShell>
  );
}

// ─── NutritionCard ─────────────────────────────────────────────────

export type NutritionCardData = {
  calories: number;
  calorieGoal?: number;
  protein: number;
  carbs: number;
  fat: number;
  mealName?: string;
  mealType?: string;
};

export function NutritionCard({ data }: { data: NutritionCardData }) {
  const { calories, calorieGoal = 2000, protein, carbs, fat, mealName, mealType } = data;
  const calPct = Math.round((calories / calorieGoal) * 100);

  const macros = [
    { label: 'Protein', value: protein, unit: 'g', color: colors.blue },
    { label: 'Carbs',   value: carbs,   unit: 'g', color: colors.amber },
    { label: 'Fat',     value: fat,     unit: 'g', color: colors.coral },
  ];

  return (
    <CardShell>
      <View style={sh.cardHeader}>
        <View style={sh.cellIconRow}>
          <Apple size={16} color={colors.emerald} strokeWidth={2.5} />
          <CardLabel label={mealName ? mealName : 'Nutrition'} />
        </View>
        {mealType && (
          <View style={[sh.badgePill, { backgroundColor: colors.emeraldSoft }]}>
            <Text style={[sh.badgeText, { color: colors.emerald }]}>{mealType}</Text>
          </View>
        )}
      </View>

      <View style={sh.calRow}>
        <View style={sh.arcWrap}>
          <ArcProgress pct={calPct} size={72} color={colors.emerald} strokeWidth={6} />
          <View style={sh.arcCenter}>
            <Text style={[sh.arcPct, { color: colors.emerald, fontSize: 14 }]}>{calories}</Text>
            <Text style={[sh.arcPctUnit, { color: colors.emerald + 'AA' }]}>kcal</Text>
          </View>
        </View>

        <View style={sh.macroGrid}>
          {macros.map(m => (
            <View key={m.label} style={sh.macroItem}>
              <Text style={[sh.macroValue, { color: m.color }]}>{m.value}{m.unit}</Text>
              <Text style={sh.macroLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </CardShell>
  );
}

// ─── InsightCard ───────────────────────────────────────────────────

export type InsightCardData = {
  insight: string;
  category?: 'hydration' | 'sleep' | 'habits' | 'nutrition' | 'energy' | 'general';
  score?: number;
};

const INSIGHT_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  hydration: { color: colors.blue,    icon: <Droplets size={14} color={colors.blue} strokeWidth={2.5} />,    label: 'Hydration Insight' },
  sleep:     { color: colors.lilac,   icon: <Moon     size={14} color={colors.lilac} strokeWidth={2.5} />,   label: 'Sleep Insight' },
  habits:    { color: colors.emerald, icon: <Target   size={14} color={colors.emerald} strokeWidth={2.5} />, label: 'Habit Insight' },
  nutrition: { color: colors.amber,   icon: <Apple    size={14} color={colors.amber} strokeWidth={2.5} />,   label: 'Nutrition Insight' },
  energy:    { color: colors.amber,   icon: <Zap      size={14} color={colors.amber} strokeWidth={2.5} />,   label: 'Energy Insight' },
  general:   { color: colors.inkSoft, icon: <Brain    size={14} color={colors.inkSoft} strokeWidth={2.5} />, label: 'Health Insight' },
};

export function InsightCard({ data }: { data: InsightCardData }) {
  const meta = INSIGHT_META[data.category ?? 'general'];

  return (
    <CardShell style={{ borderLeftWidth: 2, borderLeftColor: meta.color }}>
      <View style={sh.cardHeader}>
        <View style={sh.cellIconRow}>
          {meta.icon}
          <CardLabel label={meta.label} color={meta.color} />
        </View>
        {data.score !== undefined && (
          <MetricPill value={data.score} unit="%" color={meta.color} />
        )}
      </View>
      <Text style={sh.insightText}>{data.insight}</Text>
    </CardShell>
  );
}

// ─── WeeklyReportCard ──────────────────────────────────────────────

export type WeeklyReportData = {
  hydrationAvgMl: number;
  hydrationGoalMl: number;
  sleepAvgHours: number;
  habitsCompletionPct: number;
  topStreak: number;
  topStreakName?: string;
  period: string;
};

export function WeeklyReportCard({ data }: { data: WeeklyReportData }) {
  const {
    hydrationAvgMl, hydrationGoalMl, sleepAvgHours,
    habitsCompletionPct, topStreak, topStreakName, period,
  } = data;

  const hydPct = hydrationGoalMl > 0 ? Math.round((hydrationAvgMl / hydrationGoalMl) * 100) : 0;

  const rows = [
    { icon: <Droplets size={13} color={colors.blue} strokeWidth={2.5} />,    label: 'Avg Hydration', value: `${(hydrationAvgMl / 1000).toFixed(1)}L`, pct: hydPct,               color: colors.blue },
    { icon: <Moon     size={13} color={colors.lilac} strokeWidth={2.5} />,   label: 'Avg Sleep',     value: `${sleepAvgHours.toFixed(1)}h`,          pct: Math.round((sleepAvgHours / 8) * 100), color: colors.lilac },
    { icon: <Target   size={13} color={colors.emerald} strokeWidth={2.5} />, label: 'Habit Score',   value: `${Math.round(habitsCompletionPct)}%`,   pct: habitsCompletionPct,  color: colors.emerald },
  ];

  return (
    <CardShell>
      <View style={sh.cardHeader}>
        <View style={sh.cellIconRow}>
          <TrendingUp size={16} color={colors.amber} strokeWidth={2.5} />
          <CardLabel label="Weekly Report" color={colors.amber} />
        </View>
        <View style={[sh.badgePill, { backgroundColor: colors.amberSoft }]}>
          <Text style={[sh.badgeText, { color: colors.amber }]}>{period}</Text>
        </View>
      </View>

      <View style={sh.weekRows}>
        {rows.map(r => (
          <View key={r.label} style={sh.weekRow}>
            <View style={sh.weekRowLeft}>
              {r.icon}
              <Text style={sh.cellLabel}>{r.label}</Text>
            </View>
            <View style={sh.weekRowRight}>
              <Text style={[sh.statValue, { color: r.color }]}>{r.value}</Text>
              <View style={[sh.weekMiniBar]}>
                <View style={{ width: `${Math.min(r.pct, 100)}%` as `${number}%`, height: 3, backgroundColor: r.color, borderRadius: 2 }} />
              </View>
            </View>
          </View>
        ))}
      </View>

      {topStreak > 0 && (
        <View style={[sh.focusRow, { marginTop: spacing.sm }]}>
          <Flame size={12} color={colors.amber} strokeWidth={2.5} />
          <Text style={sh.focusText}>
            Best streak: <Text style={{ color: colors.amber }}>{topStreak} days{topStreakName ? ` · ${topStreakName}` : ''}</Text>
          </Text>
        </View>
      )}
    </CardShell>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: type.micro,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    letterSpacing: 0.8,
    paddingRight: 2, // Android: letterSpacing adds trailing space after last char causing clip
  },
  badgePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: type.micro,
    fontWeight: fontWeight.semibold,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 2,
  },
  pillValue: {
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  pillUnit: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
  },

  // Grid 2×2
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 3,
  },
  cellIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cellLabel: {
    fontSize: type.micro,
    color: colors.muted,
    fontWeight: fontWeight.medium,
  },
  cellValue: {
    fontSize: type.body,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  cellSub: {
    fontSize: type.micro,
    color: colors.muted,
  },

  // Consistency
  consistencyRow: {
    paddingTop: spacing.xs,
  },
  consistencyLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  // Arc
  arcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  arcWrap: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  arcCenter: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcPct: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    lineHeight: 18,
  },
  arcPctUnit: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    lineHeight: 12,
  },
  arcStats: {
    flex: 1,
    gap: spacing.xs,
  },
  arcStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statValue: {
    fontSize: type.small,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
  },
  statDivider: {
    height: 1,
    borderRadius: 1,
  },

  // Bar
  barTrack: {
    width: '100%',
    backgroundColor: colors.surface3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 4,
  },

  // Focus row
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  focusText: {
    fontSize: type.micro,
    color: colors.muted,
  },

  // Habits
  newHabitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  newHabitText: {
    fontSize: type.small,
    fontWeight: fontWeight.semibold,
  },
  habitList: {
    gap: spacing.xs,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  habitEmoji: {
    fontSize: 15,
  },
  habitTitle: {
    fontSize: type.small,
    color: colors.ink,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  habitRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.amberSoft,
    borderRadius: radius.full,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  streakNum: {
    fontSize: 10,
    color: colors.amber,
    fontWeight: fontWeight.bold,
  },
  habitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Nutrition
  calRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  macroGrid: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
    gap: 2,
  },
  macroValue: {
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  macroLabel: {
    fontSize: type.micro,
    color: colors.muted,
  },

  // Insight
  insightText: {
    fontSize: type.small,
    color: colors.inkSoft,
    lineHeight: 20,
  },

  // Weekly
  weekRows: {
    gap: spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  weekRowRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  weekMiniBar: {
    width: 60,
    height: 3,
    backgroundColor: colors.surface3,
    borderRadius: 2,
    overflow: 'hidden',
  },
});
