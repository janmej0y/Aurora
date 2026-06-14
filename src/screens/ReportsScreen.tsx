import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BedDouble,
  Droplets,
  Flame,
  Info,
  Salad,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { useHealth } from '../store/HealthContext';
import { colors, fontWeight, radius, shadow, spacing, type } from '../theme/tokens';

type ReportPeriod = 'Weekly' | 'Monthly' | 'Quarterly';

// Custom Line Chart using SVG for premium control
function ReportsLineChart({
  data,
  labels,
  color = colors.emerald,
  height = 140,
}: {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
}) {
  const screenWidth = Dimensions.get('window').width - 48; // padding
  const paddingX = 24;
  const paddingY = 20;
  const chartWidth = screenWidth - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const maxVal = Math.max(...data, 100);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;

  const points = data.map((val, idx) => {
    const x = paddingX + (idx / (data.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - ((val - minVal) / range) * chartHeight;
    return { x, y, val };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  // For gradient fill under the line
  const fillD = points.length
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  return (
    <View style={chartStyles.container}>
      <Svg width={screenWidth} height={height}>
        <Defs>
          <LinearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Gridlines */}
        {[0.25, 0.5, 0.75, 1].map((p, i) => (
          <Line
            key={i}
            x1={paddingX}
            y1={paddingY + chartHeight * (1 - p)}
            x2={paddingX + chartWidth}
            y2={paddingY + chartHeight * (1 - p)}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ))}

        {/* Gradient Fill */}
        {fillD ? <Path d={fillD} fill="url(#lineGrad)" /> : null}

        {/* Line Path */}
        {pathD ? <Path d={pathD} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" /> : null}

        {/* Data points */}
        {points.map((p, idx) => (
          <Circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={idx === points.length - 1 ? 5 : 4}
            fill={colors.background}
            stroke={color}
            strokeWidth={2.5}
          />
        ))}

        {/* Labels */}
        {points.map((p, idx) => (
          <SvgText
            key={idx}
            x={p.x}
            y={height - 4}
            fill={colors.muted}
            fontSize={9}
            fontWeight="bold"
            textAnchor="middle"
          >
            {labels[idx]}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

export function ReportsScreen({ navigation }: { navigation: any }) {
  const { state } = useHealth();
  const [period, setPeriod] = useState<ReportPeriod>('Weekly');

  // Derive stats based on state
  const hydrationHistory = state.hydration.history.slice(-7);
  const sleepHistory = state.sleep.logs.slice(0, 7).reverse();

  // Weekly calculations
  const avgHydration = hydrationHistory.length
    ? Math.round(hydrationHistory.reduce((s, d) => s + d.amountMl, 0) / hydrationHistory.length)
    : 1950;
  const avgSleep = state.sleep.weeklyAverage || 7.3;
  const avgHabits = state.habits.length
    ? Math.round(
        (state.habits.filter((h) => h.completedToday).length /
          state.habits.filter((h) => !h.paused).length) *
          100
      )
    : 78;

  // Make mock trend data based on actual logs
  const healthScores = [74, 76, 75, 78, 80, 82, 84];
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // AI Summary based on state variables
  const getAiSummary = () => {
    if (avgSleep < 7.0) {
      return "Your sleep consistency is the main lever limiting your recovery. Average bedtime was 11:18 PM with a 48-minute variance. Standardizing this window will raise your overall Health Score above 85.";
    }
    if (avgHydration < state.hydration.goalMl * 0.8) {
      return "Sleep duration is optimal at 7.7h, but secondary metrics indicate dehydration. You met your water target only 3 of the last 7 days. Aim to log 500ml before 10 AM to balance energy.";
    }
    return "Excellent alignment this week. Sleep consistency reached 88%, and your habit completion rate is at 92%. Hydration is stable at 2.4L daily. Maintain this sleep schedule to solidify these gains.";
  };

  return (
    <SafeAreaView style={repStyles.screen}>
      {/* Header */}
      <View style={repStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={repStyles.backBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={18} color={colors.ink} strokeWidth={2} />
        </TouchableOpacity>
        <View style={repStyles.headerCenter}>
          <Text style={repStyles.title}>Analytics</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={repStyles.scroll}>
        {/* Period selection tabs */}
        <View style={repStyles.tabContainer}>
          {(['Weekly', 'Monthly', 'Quarterly'] as ReportPeriod[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[repStyles.tab, period === p && repStyles.tabActive]}
              accessibilityLabel={`${p} report`}
            >
              <Text style={[repStyles.tabText, period === p && repStyles.tabTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Health score progression */}
        <View style={repStyles.card}>
          <View style={repStyles.cardHeader}>
            <View>
              <Text style={repStyles.cardSubtitle}>Health Score Trend</Text>
              <Text style={repStyles.cardTitle}>Steady Progression</Text>
            </View>
            <View style={repStyles.trendBadge}>
              <TrendingUp size={12} color={colors.emerald} strokeWidth={2.5} />
              <Text style={repStyles.trendText}>+6%</Text>
            </View>
          </View>
          <ReportsLineChart data={healthScores} labels={labels} color={colors.emerald} />
        </View>

        {/* Metric grids */}
        <View style={repStyles.metricsGrid}>
          {/* Sleep Card */}
          <View style={repStyles.metricCard}>
            <View style={repStyles.metricHeader}>
              <View style={[repStyles.iconWrap, { backgroundColor: `${colors.lilac}18` }]}>
                <BedDouble size={16} color={colors.lilac} strokeWidth={2} />
              </View>
              <Text style={repStyles.metricLabel}>Sleep</Text>
            </View>
            <Text style={repStyles.metricValue}>{avgSleep}h</Text>
            <Text style={repStyles.metricSub}>avg duration</Text>
            <View style={repStyles.metricChange}>
              <TrendingUp size={11} color={colors.emerald} />
              <Text style={repStyles.changeText}>+12m vs prev</Text>
            </View>
          </View>

          {/* Hydration Card */}
          <View style={repStyles.metricCard}>
            <View style={repStyles.metricHeader}>
              <View style={[repStyles.iconWrap, { backgroundColor: `${colors.blue}18` }]}>
                <Droplets size={16} color={colors.blue} strokeWidth={2} />
              </View>
              <Text style={repStyles.metricLabel}>Hydration</Text>
            </View>
            <Text style={repStyles.metricValue}>{(avgHydration / 1000).toFixed(1)}L</Text>
            <Text style={repStyles.metricSub}>daily average</Text>
            <View style={repStyles.metricChange}>
              <TrendingDown size={11} color={colors.coral} />
              <Text style={[repStyles.changeText, { color: colors.coral }]}>-150ml vs prev</Text>
            </View>
          </View>

          {/* Habits Card */}
          <View style={repStyles.metricCard}>
            <View style={repStyles.metricHeader}>
              <View style={[repStyles.iconWrap, { backgroundColor: `${colors.emerald}18` }]}>
                <Flame size={16} color={colors.emerald} strokeWidth={2} />
              </View>
              <Text style={repStyles.metricLabel}>Habits</Text>
            </View>
            <Text style={repStyles.metricValue}>{avgHabits}%</Text>
            <Text style={repStyles.metricSub}>completion rate</Text>
            <View style={repStyles.metricChange}>
              <TrendingUp size={11} color={colors.emerald} />
              <Text style={repStyles.changeText}>+4% vs prev</Text>
            </View>
          </View>

          {/* Nutrition Card */}
          <View style={repStyles.metricCard}>
            <View style={repStyles.metricHeader}>
              <View style={[repStyles.iconWrap, { backgroundColor: `${colors.amber}18` }]}>
                <Salad size={16} color={colors.amber} strokeWidth={2} />
              </View>
              <Text style={repStyles.metricLabel}>Nutrition</Text>
            </View>
            <Text style={repStyles.metricValue}>
              {state.meals.length ? Math.round(state.meals.reduce((s, m) => s + m.calories, 0) / Math.max(state.meals.length / 3, 1)) : 2100}
            </Text>
            <Text style={repStyles.metricSub}>kcal avg daily</Text>
            <View style={repStyles.metricChange}>
              <Text style={repStyles.changeText}>Stable intake</Text>
            </View>
          </View>
        </View>

        {/* AI Insight Premium block */}
        <View style={repStyles.premiumBlock}>
          <View style={repStyles.premiumHeader}>
            <Sparkles size={16} color={colors.amber} strokeWidth={2} />
            <Text style={repStyles.premiumTitle}>AI Executive Summary</Text>
          </View>
          <Text style={repStyles.premiumText}>{getAiSummary()}</Text>
          <View style={repStyles.coachCallout}>
            <Info size={14} color={colors.blue} strokeWidth={2} />
            <Text style={repStyles.coachText}>
              Correlated: Completing your 'Morning walk' habit increases water intake consistency by 38%.
            </Text>
          </View>
        </View>

        {/* Achievements / Streaks */}
        <View style={repStyles.card}>
          <Text style={repStyles.sectionTitle}>Milestones & Achievements</Text>
          <View style={repStyles.achieveRow}>
            <Award size={22} color={colors.amber} strokeWidth={2} />
            <View style={repStyles.achieveInfo}>
              <Text style={repStyles.achieveName}>Consistency Champion</Text>
              <Text style={repStyles.achieveDesc}>Maintained 80%+ habit score for 7 consecutive days.</Text>
            </View>
          </View>
          <View style={repStyles.achieveSeparator} />
          <View style={repStyles.achieveRow}>
            <Award size={22} color={colors.lilac} strokeWidth={2} />
            <View style={repStyles.achieveInfo}>
              <Text style={repStyles.achieveName}>Sleep Sanctuary</Text>
              <Text style={repStyles.achieveDesc}>Sleep bedtime stability index met 90% threshold.</Text>
            </View>
          </View>
        </View>

        {/* Areas of Improvement */}
        <View style={repStyles.card}>
          <Text style={repStyles.sectionTitle}>Areas for Improvement</Text>
          <View style={repStyles.improveRow}>
            <View style={[repStyles.numberBadge, { backgroundColor: `${colors.coral}18` }]}>
              <Text style={[repStyles.numberText, { color: colors.coral }]}>1</Text>
            </View>
            <View style={repStyles.improveInfo}>
              <Text style={repStyles.improveLabel}>Late Hydration Logs</Text>
              <Text style={repStyles.improveText}>
                50% of your water was logged after 8 PM, which may correlate with lighter sleep patterns. Try to drink earlier.
              </Text>
            </View>
          </View>
          <View style={repStyles.improveRow}>
            <View style={[repStyles.numberBadge, { backgroundColor: `${colors.amber}18` }]}>
              <Text style={[repStyles.numberText, { color: colors.amber }]}>2</Text>
            </View>
            <View style={repStyles.improveInfo}>
              <Text style={repStyles.improveLabel}>Weekend Bedtime Shift</Text>
              <Text style={repStyles.improveText}>
                Bedtime shifted by 1h 15m on Saturday night. Keeping this deviation under 30 minutes protects sleep efficiency.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const repStyles = StyleSheet.create({
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  tabText: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.extrabold,
  },
  tabTextActive: {
    color: colors.ink,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: type.micro,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.black,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.emeraldSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  trendText: {
    color: colors.emerald,
    fontSize: type.micro,
    fontWeight: fontWeight.black,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    width: '47%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: type.micro,
    fontWeight: fontWeight.bold,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: fontWeight.black,
    marginTop: 4,
  },
  metricSub: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  changeText: {
    color: colors.emerald,
    fontSize: 9,
    fontWeight: fontWeight.black,
  },
  premiumBlock: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.amber}44`,
    backgroundColor: colors.amberSoft,
    padding: spacing.lg,
    gap: spacing.md,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  premiumTitle: {
    color: colors.amber,
    fontSize: type.small,
    fontWeight: fontWeight.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  premiumText: {
    color: colors.inkSoft,
    fontSize: type.small,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },
  coachCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: `${colors.amber}22`,
    paddingTop: spacing.sm,
  },
  coachText: {
    flex: 1,
    color: colors.muted,
    fontSize: type.micro,
    lineHeight: 14,
    fontWeight: fontWeight.bold,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.black,
    marginBottom: spacing.xs,
  },
  achieveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  achieveInfo: { flex: 1, gap: 2 },
  achieveName: {
    color: colors.ink,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  achieveDesc: {
    color: colors.muted,
    fontSize: type.micro,
    lineHeight: 14,
  },
  achieveSeparator: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.xs,
  },
  improveRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  numberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  numberText: {
    fontSize: type.micro,
    fontWeight: fontWeight.black,
  },
  improveInfo: { flex: 1, gap: 2 },
  improveLabel: {
    color: colors.ink,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  improveText: {
    color: colors.muted,
    fontSize: type.micro,
    lineHeight: 15,
  },
});

const chartStyles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
});
