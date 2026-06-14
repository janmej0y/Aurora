import { useRef, useEffect, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const useND = Platform.OS !== 'web';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BedDouble, Bell, Droplets, Flame, ListChecks, Plus, Salad, Sparkles, TrendingUp } from 'lucide-react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop, G, Path } from 'react-native-svg';
import { AnimatedCircle } from '../components/AnimatedSvg';
import { LinearGradient } from 'expo-linear-gradient';

import { MiniBarChart } from '../components/visuals';
import { InitialsAvatar } from '../components/ui';
import { Habit } from '../types/health';
import { useHealth } from '../store/HealthContext';
import { TabParamList } from '../types/navigation';
import { colors, fontWeight, radius, shadow, spacing, type } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// ─── Animated heart + ECG ring ────────────────────────────────────
function AnimatedHealthRing({
  size, sw, r, circ, offset, center, score, tc,
}: {
  size: number; sw: number; r: number; circ: number;
  offset: number; center: number; score: number;
  tc: ReturnType<typeof useTheme>;
}) {
  // Heart beat: scale pulse
  const heartScale  = useRef(new Animated.Value(1)).current;
  // Glow ring: opacity breathe
  const glowOpacity = useRef(new Animated.Value(0.15)).current;
  // Glow ring: radius expand
  const glowRadius  = useRef(new Animated.Value(18)).current;
  // Heart fill opacity fade-in on mount
  const fillOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Heart fill fades in on mount
    Animated.timing(fillOpacity, {
      toValue: 0.25, duration: 800, useNativeDriver: useND,
    }).start();

    // 2. Heartbeat: quick scale up, quick down, pause, repeat
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.22, duration: 140, useNativeDriver: useND }),
        Animated.timing(heartScale, { toValue: 0.96, duration: 120, useNativeDriver: useND }),
        Animated.timing(heartScale, { toValue: 1.14, duration: 100, useNativeDriver: useND }),
        Animated.timing(heartScale, { toValue: 1.00, duration: 100, useNativeDriver: useND }),
        Animated.delay(820), // ~1 beat per second
      ])
    );

    // 3. Glow ring breathes outward in sync with beat
    const glow = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowOpacity, { toValue: 0.55, duration: 360, useNativeDriver: useND }),
          Animated.timing(glowRadius,  { toValue: 24,   duration: 360, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(glowOpacity, { toValue: 0.08, duration: 700, useNativeDriver: useND }),
          Animated.timing(glowRadius,  { toValue: 18,   duration: 700, useNativeDriver: false }),
        ]),
        Animated.delay(220),
      ])
    );

    beat.start();
    glow.start();
    return () => { beat.stop(); glow.stop(); };
  }, []);

  // ECG dash animation — Animated value to avoid setState on every frame
  const ecgAnim = useRef(new Animated.Value(40)).current;
  useEffect(() => {
    const ecg = Animated.loop(
      Animated.timing(ecgAnim, {
        toValue: -40,
        duration: 1320,
        useNativeDriver: false,
      })
    );
    ecg.start();
    return () => ecg.stop();
  }, []);

  // Derive glow color from score
  const glowColor = score >= 85 ? colors.emerald
                  : score >= 70 ? colors.blue
                  : score >= 55 ? colors.amber
                  : colors.coral;

  return (
    <View style={homeStyles.scoreRingWrap}>
      {/* Outer animated glow ring — View-level, behind SVG */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size, height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: glowColor,
          opacity: glowOpacity,
          transform: [{ scale: glowRadius.interpolate({ inputRange: [18, 24], outputRange: [1, 1.12] }) }],
        }}
      />

      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgLinearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.emerald} />
            <Stop offset="100%" stopColor="#14B8A6" />
          </SvgLinearGradient>
          <RadialGradient id="heartGlow" cx="50%" cy="40%" r="60%">
            <Stop offset="0%"   stopColor={colors.emerald} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={colors.emerald} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Track */}
        <Circle cx={center} cy={center} r={r} fill="none" stroke={tc.track} strokeWidth={sw} />

        {/* Progress arc */}
        <Circle
          cx={center} cy={center} r={r} fill="none"
          stroke="url(#scoreGrad)" strokeWidth={sw}
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />

        {/* Heart + ECG — animated via transform on a G */}
        <G transform={`translate(${center}, ${center - 3})`}>
          {/* Soft glow behind heart */}
          <Path
            d="M0 8 C0 8 -14 -2 -14 -9 C-14 -17 -7 -19 0 -12 C7 -19 14 -17 14 -9 C14 -2 0 8 0 8 Z"
            fill="url(#heartGlow)"
            opacity={0.35}
          />

          {/* Heart outline */}
          <Path
            d="M0 7 C0 7 -13 -2 -13 -9 C-13 -16 -6.5 -18 0 -11 C6.5 -18 13 -16 13 -9 C13 -2 0 7 0 7 Z"
            fill="none"
            stroke={colors.emerald}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />

          {/* ECG pulse line — travelling dash animation */}
          <Path
            d="M-11 -5 L-7 -5 L-4 -13 L0 1 L4 -10 L7 -5 L11 -5"
            fill="none"
            stroke={colors.emerald}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="14 26"
            strokeDashoffset={ecgAnim as unknown as number}
            opacity={0.95}
          />

          {/* Bright dot at peak of ECG — the "spark" */}
          <Path
            d="M0 1 L0 1"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.7}
          />
        </G>
      </Svg>

      {/* Heartbeat scale pulse — overlaid View that pulses */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 28, height: 28,
          borderRadius: 14,
          backgroundColor: `${colors.emerald}22`,
          transform: [{ scale: heartScale }],
          top: center - 17,
          left: center - 14,
        }}
      />
    </View>
  );
}

function HealthScoreCard({
  score,
  hydPct,
  sleepHours,
  habitPct,
  calories,
  insight,
  tc,
}: {
  score: number;
  hydPct: number;
  sleepHours: number;
  habitPct: number;
  calories: number;
  insight: string;
  tc: ReturnType<typeof useTheme>;
}) {
  const size = 100;
  const sw = 8;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(score, 100)) / 100);
  const center = size / 2;

  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Fair' : 'Needs Work';
  const labelColor = score >= 85 ? colors.emerald : score >= 70 ? colors.blue : score >= 55 ? colors.amber : colors.coral;

  return (
    <View style={[homeStyles.scoreCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
      {/* Top Row: Score info & Ring */}
      <View style={homeStyles.scoreTopRow}>
        <View style={homeStyles.scoreLeft}>
          <Text style={homeStyles.scoreLabel}>Your Health Score</Text>
          <View style={homeStyles.scoreTextRow}>
            <Text style={homeStyles.scoreBigVal}>{score}</Text>
            <Text style={homeStyles.scoreMaxVal}>/100</Text>
          </View>
          <View style={homeStyles.scoreQualityRow}>
            <Text style={[homeStyles.scoreQuality, { color: labelColor }]}>{label}</Text>
          </View>
        </View>

        {/* Circular Progress Ring with animated heart */}
        <AnimatedHealthRing
          size={size} sw={sw} r={r} circ={circ} offset={offset} center={center}
          score={score} tc={tc}
        />
      </View>

      {/* Horizontal Divider */}
      <View style={[homeStyles.scoreDivider, { backgroundColor: tc.border }]} />

      {/* Bottom Row: AI Insights with small sparkline */}
      <View style={homeStyles.insightContainer}>
        <View style={homeStyles.insightHeader}>
          <View style={homeStyles.insightTitleRow}>
            <Sparkles size={14} color={colors.amber} strokeWidth={2.5} />
            <Text style={homeStyles.insightLabel}>Insights</Text>
          </View>
          {/* Green Sparkline Graph */}
          <Svg width={60} height={20} viewBox="0 0 60 20">
            <Path
              d="M 0 15 Q 15 5 30 12 T 60 5"
              fill="none"
              stroke={colors.emerald}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </Svg>
        </View>
        <Text style={homeStyles.insightText}>{insight}</Text>
      </View>
    </View>
  );
}

function AnimatedHabitRow({
  habit,
  onComplete,
  tc,
}: {
  habit: Habit;
  onComplete: (id: string) => void;
  tc: ReturnType<typeof useTheme>;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.04, useNativeDriver: useND, tension: 300, friction: 6 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: useND, tension: 300, friction: 6 }),
    ]).start(() => onComplete(habit.id));
  };

  return (
    <Animated.View
      style={[
        homeStyles.habitRow,
        { backgroundColor: tc.surface, borderColor: tc.border, transform: [{ scale }] },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        style={homeStyles.habitCheck}
        accessibilityLabel={`Complete ${habit.title}`}
      />
      <Text style={homeStyles.habitEmoji}>{habit.emoji || '⭐'}</Text>
      <Text style={homeStyles.habitTitle}>{habit.title}</Text>
      <View style={homeStyles.habitMeta}>
        <Flame size={11} color={habit.color || colors.emerald} strokeWidth={2} />
        <Text style={[homeStyles.habitStreak, { color: habit.color || colors.emerald }]}>{habit.streak}d</Text>
      </View>
    </Animated.View>
  );
}

export function HomeScreen() {
  const { state, addWater, completeHabit } = useHealth();
  const navigation = useNavigation<any>();
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const perfAnim = useRef(new Animated.Value(0)).current;
  const tc = useTheme();

  const firstName = state.user.name.trim().split(' ')[0] || 'there';
  const hydPct = Math.min(100, Math.round((state.hydration.currentMl / state.hydration.goalMl) * 100));
  const activeHabits = state.habits.filter((h) => !h.paused);
  const completedHabits = activeHabits.filter((h) => h.completedToday).length;
  const habitPct = activeHabits.length ? Math.round((completedHabits / activeHabits.length) * 100) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const mealsToday = state.meals.filter((m) => m.date === today);
  const calories = mealsToday.reduce((s, m) => s + m.calories, 0);

  // Overall Health Score calculation
  const healthScore = Math.round(
    (hydPct * 0.25) + (Math.min(100, (state.sleep.lastHours / 8) * 100) * 0.3) + (habitPct * 0.25) + (Math.min(100, (calories / 2000) * 100) * 0.2)
  );

  // Recovery Score and Consistency Score calculations
  const recoveryScore = state.sleep.score;
  const consistencyScore = Math.round(
    (habitPct * 0.6) + (Math.min(100, (state.hydration.currentMl / state.hydration.goalMl) * 100) * 0.4)
  );

  const weekHistory = state.hydration.history.slice(-7);
  const weekLabels = weekHistory.map((d) => new Date(`${d.date}T00:00:00`).toLocaleDateString('en', { weekday: 'short' }).slice(0, 1));
  const longestStreak = Math.max(...state.habits.map((h) => h.longestStreak), 0);
  const currentStreaks = state.habits.filter((h) => h.streak > 0 && !h.paused);

  const isPerfectDay = activeHabits.length > 0 && habitPct === 100 && hydPct >= 100;
  const isFirstDay = state.habits.length === 0 && state.sleep.logs.length === 0;

  useEffect(() => {
    if (!isPerfectDay) {
      perfAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(perfAnim, { toValue: 1, duration: 1600, useNativeDriver: useND }),
        Animated.timing(perfAnim, { toValue: 0.25, duration: 1600, useNativeDriver: useND }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isPerfectDay]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });

  const insight = state.sleep.lastHours < state.sleep.weeklyAverage - 0.3
    ? `You slept ${(state.sleep.weeklyAverage - state.sleep.lastHours).toFixed(1)}h less than your weekly average. Prioritize hydration and a calm bedtime tonight.`
    : hydPct < 50
    ? `You're at ${hydPct}% hydration. Add one glass now to keep your energy stable through the day.`
    : `Your sleep is close to baseline. Finish ${Math.max(0, state.hydration.goalMl - state.hydration.currentMl)} ml and protect tonight's routine.`;

  // Upcoming Tasks (uncompleted habits for today)
  const upcomingTasks = activeHabits.filter((h) => !h.completedToday);

  // Recent Activities list compilation
  const recentActivities = [];
  if (state.sleep.logs.length > 0) {
    const lastSleep = state.sleep.logs[0];
    recentActivities.push({
      id: `act-sleep-${lastSleep.id}`,
      type: 'sleep',
      title: 'Sleep Session Logged',
      detail: `${lastSleep.hours} hours (${lastSleep.bedtime} → ${lastSleep.wakeTime})`,
      time: 'Morning',
      color: colors.lilac,
    });
  }
  if (state.meals.length > 0) {
    const lastMeal = state.meals[0];
    recentActivities.push({
      id: `act-meal-${lastMeal.id}`,
      type: 'meal',
      title: `${lastMeal.name} Logged`,
      detail: `${lastMeal.calories} kcal · ${lastMeal.protein}g protein (${lastMeal.type})`,
      time: 'Today',
      color: colors.amber,
    });
  }
  if (state.hydration.currentMl > 0) {
    recentActivities.push({
      id: 'act-water',
      type: 'water',
      title: 'Water Intake Updated',
      detail: `Total today reaches ${state.hydration.currentMl} ml`,
      time: 'Just now',
      color: colors.blue,
    });
  }

  return (
    <SafeAreaView style={[homeStyles.screen, { backgroundColor: tc.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={homeStyles.scroll}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollAnim } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={homeStyles.header}>
          <View style={{ flex: 1, minWidth: 0, marginRight: spacing.md }}>
            <Text style={homeStyles.dateText}>{dateStr}</Text>
            <Text style={homeStyles.greeting} numberOfLines={1} ellipsizeMode="tail">
              {greeting}, {firstName} 👋
            </Text>
          </View>
          <View style={homeStyles.headerRight}>
            <TouchableOpacity style={[homeStyles.bellBtn, { backgroundColor: tc.surface, borderColor: tc.border }]} accessibilityLabel="Notifications">
              <Bell size={18} color={colors.ink} strokeWidth={2} />
              <View style={homeStyles.bellDot} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} accessibilityLabel="View profile">
              <InitialsAvatar name={state.user.name} size={40} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Health Score Card */}
        <View>
          {isPerfectDay && (
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: radius.lg + 2, borderWidth: 1.5, borderColor: colors.emerald, opacity: perfAnim, margin: -1, zIndex: 1 },
              ]}
            />
          )}
          {isFirstDay ? (
            <View style={[homeStyles.scoreCard, { backgroundColor: tc.surface, borderColor: tc.border, alignItems: 'center', gap: spacing.xl, paddingVertical: spacing.xxxl }]}>
              <Text style={{ fontSize: 36 }}>🌅</Text>
              <View style={{ alignItems: 'center', gap: spacing.sm }}>
                <Text style={homeStyles.sectionTitle}>Your journey starts today</Text>
                <Text style={{ color: colors.muted, fontSize: type.small, textAlign: 'center', lineHeight: 20 }}>
                  Log a metric to see your Health Score
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => addWater(250)}
                style={{ backgroundColor: colors.emerald, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2, borderRadius: radius.md }}
                accessibilityLabel="Log first water"
              >
                <Text style={{ color: colors.background, fontWeight: fontWeight.black, fontSize: type.small }}>Log first glass of water →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <HealthScoreCard
              score={healthScore}
              hydPct={hydPct}
              sleepHours={state.sleep.lastHours}
              habitPct={habitPct}
              calories={calories}
              insight={insight}
              tc={tc}
            />
          )}
        </View>

        {/* Rhythm & Recovery Scores */}
        <View style={homeStyles.rhythmSection}>
          <View style={[homeStyles.rhythmCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
            <View style={homeStyles.rhythmHeader}>
              <BedDouble size={14} color={colors.lilac} strokeWidth={2.5} />
              <Text style={homeStyles.rhythmLabel}>Recovery Score</Text>
            </View>
            <Text style={[homeStyles.rhythmValue, { color: colors.lilac }]}>{recoveryScore}</Text>
            <Text style={homeStyles.rhythmDetail}>Based on sleep & stability</Text>
          </View>
          <View style={[homeStyles.rhythmCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
            <View style={homeStyles.rhythmHeader}>
              <Flame size={14} color={colors.emerald} strokeWidth={2.5} />
              <Text style={homeStyles.rhythmLabel}>Consistency Score</Text>
            </View>
            <Text style={[homeStyles.rhythmValue, { color: colors.emerald }]}>{consistencyScore}%</Text>
            <Text style={homeStyles.rhythmDetail}>Habit & hydration streaks</Text>
          </View>
        </View>

        {/* Premium Reports Navigation Banner */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Reports')}
          style={[homeStyles.reportsBanner, { backgroundColor: tc.surface, borderColor: `${colors.amber}33` }]}
          accessibilityLabel="View health reports"
        >
          <View style={homeStyles.reportsBannerLeft}>
            <Sparkles size={18} color={colors.amber} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={repBannerStyles.bannerTitle}>Weekly Report Available</Text>
              <Text style={repBannerStyles.bannerSubtitle}>
                Deep-dive sleep recovery analysis & consistency score analytics.
              </Text>
            </View>
          </View>
          <View style={[homeStyles.reportsBannerBtn, { backgroundColor: tc.surface2, borderColor: tc.border }]}>
            <Text style={homeStyles.reportsBannerBtnText}>View →</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Overview Grid */}
        <View>
          <Text style={homeStyles.sectionTitle}>At A Glance</Text>
          <View style={homeStyles.overviewGrid}>
            <View style={homeStyles.overviewRow}>
              <Pressable
                onPress={() => navigation.navigate('Water')}
                style={[homeStyles.overviewCard, { backgroundColor: tc.surface, borderColor: tc.border }]}
                accessibilityLabel="Hydration"
              >
                <View style={[homeStyles.overviewIcon, { backgroundColor: colors.blueSoft }]}>
                  <Droplets size={16} color={colors.blue} strokeWidth={2} />
                </View>
                <Text style={homeStyles.overviewLabel}>Hydration</Text>
                <Text style={[homeStyles.overviewValue, { color: colors.blue }]}>{hydPct}%</Text>
                <Text style={homeStyles.overviewDetail}>
                  {(state.hydration.currentMl / 1000).toFixed(1)} / {(state.hydration.goalMl / 1000).toFixed(1)} L
                </Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate('Sleep')}
                style={[homeStyles.overviewCard, { backgroundColor: tc.surface, borderColor: tc.border }]}
                accessibilityLabel="Sleep"
              >
                <View style={[homeStyles.overviewIcon, { backgroundColor: colors.lilacSoft }]}>
                  <BedDouble size={16} color={colors.lilac} strokeWidth={2} />
                </View>
                <Text style={homeStyles.overviewLabel}>Sleep</Text>
                <Text style={[homeStyles.overviewValue, { color: colors.lilac }]}>{state.sleep.lastHours}h</Text>
                <Text style={homeStyles.overviewDetail}>{state.sleep.weeklyAverage}h weekly avg</Text>
              </Pressable>
            </View>

            <View style={homeStyles.overviewRow}>
              <Pressable
                onPress={() => navigation.navigate('Habits')}
                style={[homeStyles.overviewCard, { backgroundColor: tc.surface, borderColor: tc.border }]}
                accessibilityLabel="Habits"
              >
                <View style={[homeStyles.overviewIcon, { backgroundColor: colors.emeraldSoft }]}>
                  <ListChecks size={16} color={colors.emerald} strokeWidth={2} />
                </View>
                <Text style={homeStyles.overviewLabel}>Habits</Text>
                <Text style={[homeStyles.overviewValue, { color: colors.emerald }]}>{completedHabits}/{activeHabits.length}</Text>
                <Text style={homeStyles.overviewDetail}>{habitPct}% done</Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate('Nutrition')}
                style={[homeStyles.overviewCard, { backgroundColor: tc.surface, borderColor: tc.border }]}
                accessibilityLabel="Nutrition"
              >
                <View style={[homeStyles.overviewIcon, { backgroundColor: colors.amberSoft }]}>
                  <Salad size={16} color={colors.amber} strokeWidth={2} />
                </View>
                <Text style={homeStyles.overviewLabel}>Nutrition</Text>
                <Text style={[homeStyles.overviewValue, { color: colors.amber }]}>{calories}</Text>
                <Text style={homeStyles.overviewDetail}>kcal · {mealsToday.length} meals</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Quick Add Water */}
        <View style={homeStyles.quickAddSection}>
          <Text style={homeStyles.sectionTitle}>Quick Add</Text>
          <View style={homeStyles.quickAddRow}>
            {[250, 500, 750].map((ml) => (
              <Pressable
                key={ml}
                onPress={() => addWater(ml)}
                style={({ pressed }) => [
                  homeStyles.quickAddBtn,
                  homeStyles.quickAddWater,
                  { backgroundColor: tc.surface, borderColor: colors.blueGlow },
                  pressed && homeStyles.quickAddPressed,
                ]}
                accessibilityLabel={`Add ${ml} ml water`}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(59, 130, 246, 0.20)', 'rgba(59, 130, 246, 0.06)', 'rgba(21, 27, 35, 0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={homeStyles.quickAddGradient}
                />
                <View style={homeStyles.quickAddIconPlate}>
                  <Droplets size={12} color={colors.blue} strokeWidth={2.4} />
                </View>
                <Text style={homeStyles.quickAddText}>+{ml} ml</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => navigation.navigate('Water')}
              style={({ pressed }) => [
                homeStyles.quickAddBtn,
                homeStyles.quickAddCustom,
                { backgroundColor: tc.surface2, borderColor: tc.borderStrong },
                pressed && homeStyles.quickAddPressed,
              ]}
              accessibilityLabel="Custom water amount"
            >
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255, 255, 255, 0.07)', 'rgba(255, 255, 255, 0.015)', 'rgba(255, 255, 255, 0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={homeStyles.quickAddGradient}
              />
              <Plus size={13} color={colors.inkSoft} strokeWidth={2.4} />
              <Text style={homeStyles.quickAddCustomText}>Custom</Text>
            </Pressable>
          </View>
        </View>

        {/* Weekly chart */}
        <View style={[homeStyles.chartCard, { backgroundColor: tc.surface, borderColor: tc.borderStrong }]}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(59, 130, 246, 0.11)', 'rgba(59, 130, 246, 0.025)', 'rgba(59, 130, 246, 0)']}
            style={homeStyles.chartCardWash}
          />
          <View style={homeStyles.chartHeader}>
            <Text style={homeStyles.sectionTitle}>Weekly Hydration</Text>
            <Text style={homeStyles.chartSub}>Last 7 days</Text>
          </View>
          <MiniBarChart
            values={weekHistory.map((d) => d.amountMl)}
            max={state.hydration.goalMl}
            color={colors.blue}
            labels={weekLabels}
            goal={state.hydration.goalMl}
          />
        </View>

        {/* Active Streaks */}
        {currentStreaks.length > 0 && (
          <View>
            <Text style={homeStyles.sectionTitle}>Active Streaks 🔥</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={homeStyles.streakScroll} contentContainerStyle={homeStyles.streakContent}>
              {currentStreaks.slice(0, 5).map((habit) => (
                <View key={habit.id} style={[homeStyles.streakCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
                  <Text style={homeStyles.streakEmoji}>{habit.emoji || '⭐'}</Text>
                  <Text style={homeStyles.streakDays} numberOfLines={1}>{habit.streak}d</Text>
                  <Text style={homeStyles.streakHabit} numberOfLines={1}>{habit.title}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Upcoming Tasks (Habits yet to do today) */}
        {upcomingTasks.length > 0 && (
          <View>
            <Text style={homeStyles.sectionTitle}>Upcoming Tasks ({upcomingTasks.length})</Text>
            <View style={homeStyles.habitList}>
              {upcomingTasks.slice(0, 3).map((habit) => (
                <AnimatedHabitRow key={habit.id} habit={habit} onComplete={completeHabit} tc={tc} />
              ))}
            </View>
          </View>
        )}

        {/* Recent Activities feed */}
        {recentActivities.length > 0 && (
          <View>
            <Text style={homeStyles.sectionTitle}>Recent Activities</Text>
            <View style={homeStyles.activityFeed}>
              {recentActivities.map((act) => (
                <View key={act.id} style={[repBannerStyles.activityRow, { backgroundColor: tc.surface, borderColor: tc.border }]}>
                  <View style={[repBannerStyles.activityIconWrap, { backgroundColor: `${act.color}18` }]}>
                    <View style={[repBannerStyles.activityDot, { backgroundColor: act.color }]} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={repBannerStyles.activityTitle}>{act.title}</Text>
                    <Text style={repBannerStyles.activityDetail}>{act.detail}</Text>
                  </View>
                  <Text style={repBannerStyles.activityTime}>{act.time}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Aurora CTA */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Companion')}
          style={homeStyles.auroraCta}
          accessibilityLabel="Talk to Aurora"
        >
          <LinearGradient
            pointerEvents="none"
            colors={[colors.emerald, '#14B8A6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View>
            <Text style={homeStyles.auroraCtaTitle}>Talk to Aurora</Text>
            <Text style={homeStyles.auroraCtaSubtitle}>Ask about your week or log an update</Text>
          </View>
          <View style={homeStyles.auroraCtaBtn}>
            <Text style={homeStyles.auroraCtaBtnText}>Open →</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const homeStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 110,
    gap: spacing.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dateText: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greeting: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: fontWeight.black,
    letterSpacing: -0.3,
    marginTop: 4,
    lineHeight: 32,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.emerald,
    borderWidth: 1,
    borderColor: colors.background,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  // Health Score
  scoreCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadow,
  },
  scoreTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLeft: {
    flex: 1,
    gap: 4,
  },
  scoreLabel: {
    color: colors.muted,
    fontSize: type.micro,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginVertical: 4,
  },
  scoreBigVal: {
    color: colors.ink,
    fontSize: 38,
    fontWeight: fontWeight.black,
    letterSpacing: -1,
  },
  scoreMaxVal: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  scoreQualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoreQuality: {
    fontSize: type.body,
    fontWeight: fontWeight.black,
  },
  scoreTrend: {
    color: colors.emerald,
    fontSize: type.micro,
    fontWeight: fontWeight.black,
  },
  scoreRingWrap: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  scoreCenterVal: {
    fontSize: 18,
    fontWeight: fontWeight.black,
  },
  scoreDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  insightContainer: {
    gap: spacing.xs,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  insightLabel: {
    color: colors.amber,
    fontSize: type.micro,
    fontWeight: fontWeight.black,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  insightText: {
    color: colors.inkSoft,
    fontSize: type.small,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },

  // Section
  sectionTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.black,
    letterSpacing: -0.2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  seeAll: {
    color: colors.emerald,
    fontSize: type.small,
    fontWeight: fontWeight.extrabold,
  },

  // Overview Grid
  overviewGrid: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  overviewCard: {
    flex: 1,
    minHeight: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: 3,
    ...shadow,
  },
  overviewIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  overviewLabel: {
    color: colors.muted,
    fontSize: type.micro,
    fontWeight: fontWeight.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: fontWeight.black,
    letterSpacing: -0.5,
  },
  overviewDetail: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },

  // Quick Add
  quickAddSection: { gap: spacing.md },
  quickAddRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 46,
    minWidth: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    position: 'relative',
  },
  quickAddWater: {
    borderColor: colors.blueGlow,
  },
  quickAddGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  quickAddIconPlate: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  quickAddText: {
    color: colors.blue,
    fontSize: type.small,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 0,
  },
  quickAddCustom: {
    backgroundColor: colors.surface2,
  },
  quickAddCustomText: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.extrabold,
  },

  // Chart
  chartCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
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
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartSub: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },

  // Streaks
  streakScroll: { marginTop: spacing.md },
  streakContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  streakCard: {
    width: 80,
    height: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  streakEmoji: { fontSize: 20 },
  streakDays: {
    color: colors.emerald,
    fontSize: type.body,
    fontWeight: fontWeight.black,
  },
  streakHabit: {
    color: colors.muted,
    fontSize: type.micro,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    paddingHorizontal: 4,
  },

  // Habits
  habitList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  habitCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitCheckmark: {
    color: colors.background,
    fontSize: 12,
    fontWeight: fontWeight.black,
  },
  habitEmoji: { fontSize: 16 },
  habitTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.bold,
  },
  habitTitleDone: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  habitStreak: {
    fontSize: type.small,
    fontWeight: fontWeight.extrabold,
  },

  // Aurora CTA
  auroraCta: {
    borderRadius: radius.md,
    overflow: 'hidden',
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  auroraCtaTitle: {
    color: colors.background,
    fontSize: type.body,
    fontWeight: fontWeight.black,
  },
  auroraCtaSubtitle: {
    color: `${colors.background}BB`,
    fontSize: type.small,
    marginTop: 3,
  },
  auroraCtaBtn: {
    backgroundColor: `${colors.background}22`,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  auroraCtaBtnText: {
    color: colors.background,
    fontSize: type.small,
    fontWeight: fontWeight.extrabold,
  },

  // Rhythm & Recovery
  rhythmSection: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rhythmCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: 4,
    ...shadow,
  },
  rhythmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rhythmLabel: {
    color: colors.muted,
    fontSize: type.micro,
    fontWeight: fontWeight.bold,
  },
  rhythmValue: {
    fontSize: 24,
    fontWeight: fontWeight.black,
  },
  rhythmDetail: {
    color: colors.subtle,
    fontSize: type.micro,
  },

  // Reports Banner
  reportsBanner: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.amber}33`,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    ...shadow,
  },
  reportsBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reportsBannerBtn: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reportsBannerBtnText: {
    color: colors.inkSoft,
    fontSize: type.micro,
    fontWeight: fontWeight.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Activity Feed
  activityFeed: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});

const repBannerStyles = StyleSheet.create({
  bannerTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.black,
  },
  bannerSubtitle: {
    color: colors.muted,
    fontSize: type.small,
    marginTop: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  activityIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityTitle: {
    color: colors.ink,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  activityDetail: {
    color: colors.muted,
    fontSize: type.micro,
  },
  activityTime: {
    color: colors.subtle,
    fontSize: type.micro,
    fontWeight: fontWeight.bold,
  },
});
