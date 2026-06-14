import { useEffect, useRef } from 'react';
import { Animated, DimensionValue, Easing, Platform, StyleSheet, Text, View } from 'react-native';

const useND = Platform.OS !== 'web';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { colors, fontWeight, radius, shadow, spacing, type } from '../theme/tokens';

// ─────────────────────────────────────────
// WaterBottle — animated dark glass bottle
// ─────────────────────────────────────────
type BottleProps = {
  progress: number;
  amountMl: number;
  goalMl: number;
};

export function WaterBottle({ progress, amountMl, goalMl }: BottleProps) {
  const normalizedProgress = Math.max(0, Math.min(progress, 100));
  const isGoalMet = progress >= 100;
  const primaryColor = isGoalMet ? colors.emerald : colors.blue;

  // Calculate liquid Y level (y goes from 256 at 0% to 32 at 100%)
  const liquidHeight = (224 * normalizedProgress) / 100;
  const liquidY = 256 - liquidHeight;

  return (
    <View style={visualStyles.bottleWrap}>
      <View style={visualStyles.bottleContainer}>
        <Svg width={150} height={290} viewBox="0 0 120 280">
          <Defs>
            {/* Shadow/Glow under the bottle */}
            <RadialGradient id="shadowGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#090D14" stopOpacity="0" />
            </RadialGradient>

            {/* Glass border gradient */}
            <LinearGradient id="glassBorder" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#2B354C" />
              <Stop offset="30%" stopColor="#3E4C5A" />
              <Stop offset="50%" stopColor="#1D2433" />
              <Stop offset="70%" stopColor="#3E4C5A" />
              <Stop offset="100%" stopColor="#2B354C" />
            </LinearGradient>

            {/* Metal cap gradient */}
            <LinearGradient id="metalCap" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#1F2937" />
              <Stop offset="30%" stopColor="#4B5563" />
              <Stop offset="50%" stopColor="#D1D5DB" />
              <Stop offset="70%" stopColor="#4B5563" />
              <Stop offset="100%" stopColor="#1F2937" />
            </LinearGradient>

            {/* Liquid gradient */}
            <LinearGradient id="liquidGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <Stop offset="0%" stopColor={isGoalMet ? '#059669' : '#1D4ED8'} />
              <Stop offset="60%" stopColor={isGoalMet ? '#10B981' : '#2563EB'} />
              <Stop offset="100%" stopColor={isGoalMet ? '#34D399' : '#38BDF8'} />
            </LinearGradient>

            {/* Highlight/Reflection gradient */}
            <LinearGradient id="reflectGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>

            {/* Inner glass shadow gradient */}
            <LinearGradient id="innerGlassShadow" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
              <Stop offset="20%" stopColor="#000000" stopOpacity="0" />
              <Stop offset="80%" stopColor="#000000" stopOpacity="0" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
            </LinearGradient>

            {/* Clip path for the inside of the bottle */}
            <ClipPath id="innerBottleClip">
              <Path d="M 44 32 h 32 v 28 q 0 15 12 23 v 163 q 0 10 -10 10 h -36 q -10 0 -10 -10 v -163 q 12 -8 12 -23 Z" />
            </ClipPath>
          </Defs>

          {/* Shadow/Glow Base */}
          <Ellipse cx={60} cy={266} rx={44} ry={8} fill="url(#shadowGlow)" />

          {/* Outer Glass Bottle Shape */}
          <Path
            d="M 42 30 h 36 v 30 q 0 15 14 25 v 165 q 0 12 -12 12 h -40 q -12 0 -12 -12 v -165 q 14 -10 14 -25 Z"
            fill="#0E1320"
            stroke="url(#glassBorder)"
            strokeWidth={2.5}
          />

          {/* Inside Content (Liquid and shadows, clipped) */}
          <G clipPath="url(#innerBottleClip)">
            {/* Liquid fill */}
            {normalizedProgress > 0 && (
              <G>
                {/* Main liquid block with dynamic height */}
                <Path
                  d={`M 10 ${liquidY} Q 35 ${liquidY - 5} 60 ${liquidY} T 110 ${liquidY} V 270 H 10 Z`}
                  fill="url(#liquidGrad)"
                />
                {/* Secondary wave overlay for depth */}
                <Path
                  d={`M 10 ${liquidY} Q 25 ${liquidY + 4} 60 ${liquidY} T 110 ${liquidY} V 270 H 10 Z`}
                  fill="#FFFFFF"
                  opacity={0.12}
                />
              </G>
            )}

            {/* Inner shadow overlay for depth */}
            <Path
              d="M 44 32 h 32 v 28 q 0 15 12 23 v 163 q 0 10 -10 10 h -36 q -10 0 -10 -10 v -163 q 12 -8 12 -23 Z"
              fill="url(#innerGlassShadow)"
            />
          </G>

          {/* Left Side Highlight (Glass Reflection) */}
          <Path
            d="M 33 88 v 150"
            stroke="url(#reflectGrad)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          {/* Right Side Highlight (Glass Reflection, thinner) */}
          <Path
            d="M 87 92 v 140"
            stroke="#FFFFFF"
            strokeWidth={1}
            opacity={0.08}
            strokeLinecap="round"
          />

          {/* Collar (neck ring) */}
          <Path
            d="M 39 26 h 42 a 2 2 0 0 1 2 2 v 2 a 2 2 0 0 1 -2 2 h -42 a 2 2 0 0 1 -2 -2 v -2 a 2 2 0 0 1 2 -2 Z"
            fill="url(#metalCap)"
          />

          {/* Cap */}
          <Path
            d="M 43 10 h 34 a 3 3 0 0 1 3 3 v 13 h -40 v -13 a 3 3 0 0 1 3 -3 Z"
            fill="url(#metalCap)"
            stroke="#111622"
            strokeWidth={1}
          />
          {/* Cap Ridges (vertical texture lines) */}
          <Path d="M 48 12 v 12" stroke="#111622" strokeWidth={1} opacity={0.6} />
          <Path d="M 52 12 v 12" stroke="#111622" strokeWidth={1} opacity={0.6} />
          <Path d="M 56 12 v 12" stroke="#111622" strokeWidth={1} opacity={0.6} />
          <Path d="M 60 12 v 12" stroke="#FFFFFF" strokeWidth={1} opacity={0.2} />
          <Path d="M 64 12 v 12" stroke="#111622" strokeWidth={1} opacity={0.6} />
          <Path d="M 68 12 v 12" stroke="#111622" strokeWidth={1} opacity={0.6} />
          <Path d="M 72 12 v 12" stroke="#111622" strokeWidth={1} opacity={0.6} />
        </Svg>

        {/* Goal percentage pill overlay - sleek and modern */}
        <View style={visualStyles.bottleBadge}>
          <Text style={[visualStyles.bottleBadgeText, { color: primaryColor }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      </View>

      {/* Level markers */}
      <View style={visualStyles.markers}>
        {[100, 75, 50, 25].map((level) => (
          <View key={level} style={visualStyles.markerRow}>
            <Text style={visualStyles.markerText}>{Math.round((goalMl * level) / 100)}ml</Text>
            <View style={visualStyles.markerLine} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// MiniBarChart — dark premium bar chart
// ─────────────────────────────────────────
type BarChartProps = {
  values: number[];
  max?: number;
  color?: string;
  labels?: string[];
  goal?: number;
};

type AnimatedChartBarProps = {
  pct: number;
  barColor: string;
  index: number;
  isGoalMet: boolean;
};

function AnimatedChartBar({ pct, barColor, index, isGoalMet }: AnimatedChartBarProps) {
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 540,
      delay: index * 55,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: useND,
    }).start();
  }, [index, pct, reveal]);

  const opacity = reveal.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0, 0.85, 1],
  });
  const translateY = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });
  const scaleY = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1],
  });

  return (
    <Animated.View
      style={[
        visualStyles.chartBar,
        {
          height: `${pct}%` as DimensionValue,
          backgroundColor: barColor,
          opacity,
          transform: [{ translateY }, { scaleY }],
        },
        isGoalMet && visualStyles.chartBarGoal,
      ]}
    >
      <View style={visualStyles.chartBarSheen} />
      <View style={visualStyles.chartBarEdge} />
    </Animated.View>
  );
}

export function MiniBarChart({ values, max, color = colors.emerald, labels, goal }: BarChartProps) {
  const ceiling = Math.max(max ?? 0, goal ?? 0, ...values, 1);
  return (
    <View style={visualStyles.chartContainer}>
      <View style={visualStyles.chartRow}>
        {values.map((value, index) => {
          const pct = Math.min(100, Math.max(6, (value / ceiling) * 100));
          const isGoalMet = goal !== undefined && value >= goal;
          const barColor = isGoalMet ? colors.emerald : color;
          return (
            <View key={`${value}-${index}`} style={visualStyles.chartItem}>
              <View style={visualStyles.chartTrack}>
                <View style={visualStyles.chartTrackGloss} />
                {goal && (
                  <View
                    style={[
                      visualStyles.goalLine,
                      { bottom: `${Math.min(98, Math.max(2, (goal / ceiling) * 100))}%` as DimensionValue },
                    ]}
                  />
                )}
                <AnimatedChartBar pct={pct} barColor={barColor} index={index} isGoalMet={isGoalMet} />
              </View>
              {labels?.[index] ? (
                <Text style={[visualStyles.chartLabel, isGoalMet && visualStyles.chartLabelGoal]}>
                  {labels[index]}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// ScoreRing — premium SVG circular progress
// ─────────────────────────────────────────
type ScoreRingProps = {
  score: number;
  label: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
  showGlow?: boolean;
  sublabel?: string;
};

export function ScoreRing({
  score,
  label,
  color = colors.emerald,
  size = 140,
  strokeWidth = 10,
  showGlow = false,
  sublabel,
}: ScoreRingProps) {
  const radius_val = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius_val;
  const progress = Math.max(0, Math.min(score, 100)) / 100;
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;

  // Scale font sizes dynamically based on the ring size to prevent overlapping boundaries
  const valueFontSize = Math.round(size * 0.28);
  const labelFontSize = Math.round(size * 0.11);
  const sublabelFontSize = Math.round(size * 0.08);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius_val}
          fill="none"
          stroke={colors.track}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius_val}
          fill="none"
          stroke={showGlow ? `url(#scoreGrad)` : color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: strokeWidth }]}>
        <Text style={[visualStyles.scoreValue, { color, fontSize: valueFontSize, lineHeight: valueFontSize + 2 }]}>{score}</Text>
        <Text style={[visualStyles.scoreLabel, { fontSize: labelFontSize, lineHeight: labelFontSize + 2, color: colors.inkSoft }]}>{label}</Text>
        {sublabel ? <Text style={[visualStyles.scoreSublabel, { fontSize: sublabelFontSize, lineHeight: sublabelFontSize + 2 }]}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// CircularProgress — smaller ring (for metrics)
// ─────────────────────────────────────────
type CircularProgressProps = {
  progress: number; // 0-100
  color?: string;
  size?: number;
  strokeWidth?: number;
};

export function CircularProgress({ progress, color = colors.emerald, size = 56, strokeWidth = 5 }: CircularProgressProps) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(progress, 100)) / 100);
  const center = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={center} cy={center} r={r} fill="none" stroke={colors.track} strokeWidth={strokeWidth} />
      <Circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
      />
    </Svg>
  );
}

// ─────────────────────────────────────────
// SleepStagesBar — horizontal segmented bar
// ─────────────────────────────────────────
type StageData = {
  label: string;
  hours: number;
  color: string;
};

export function SleepStagesBar({ stages, totalHours }: { stages: StageData[]; totalHours: number }) {
  return (
    <View style={visualStyles.stagesWrap}>
      {/* Bar */}
      <View style={visualStyles.stagesBar}>
        {stages.map((stage, i) => (
          <View
            key={stage.label}
            style={[
              visualStyles.stageSegment,
              {
                backgroundColor: stage.color,
                flex: stage.hours / totalHours,
                borderTopLeftRadius: i === 0 ? 99 : 0,
                borderBottomLeftRadius: i === 0 ? 99 : 0,
                borderTopRightRadius: i === stages.length - 1 ? 99 : 0,
                borderBottomRightRadius: i === stages.length - 1 ? 99 : 0,
              },
            ]}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={visualStyles.stagesLegend}>
        {stages.map((stage) => (
          <View key={stage.label} style={visualStyles.stageLegendItem}>
            <View style={[visualStyles.stageDot, { backgroundColor: stage.color }]} />
            <Text style={visualStyles.stageLegendLabel}>{stage.label}</Text>
            <Text style={visualStyles.stageLegendValue}>{stage.hours.toFixed(1)}h</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// MacroRing — small donut ring for nutrients
// ─────────────────────────────────────────
type MacroRingProps = {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
};

export function MacroRing({ value, max, label, unit, color }: MacroRingProps) {
  const size = 80;
  const sw = 7;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, max > 0 ? value / max : 0);
  const offset = circ * (1 - pct);
  const center = size / 2;

  return (
    <View style={visualStyles.macroRingWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={center} cy={center} r={r} fill="none" stroke={colors.track} strokeWidth={sw} />
        <Circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={[visualStyles.macroRingValue, { color }]}>{value}{unit}</Text>
      </View>
      <Text style={visualStyles.macroRingLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────
// WaveformBars — voice recording animation
// ─────────────────────────────────────────
type WaveformBarsProps = {
  active: boolean;
  color?: string;
  barCount?: number;
};

const WAVE_HEIGHTS = [0.3, 0.6, 0.9, 0.7, 1.0, 0.8, 0.5, 0.7, 0.95, 0.6, 0.4, 0.8, 1.0, 0.7, 0.5];

export function WaveformBars({ active, color = colors.emerald, barCount = 15 }: WaveformBarsProps) {
  return (
    <View style={visualStyles.waveformWrap}>
      {WAVE_HEIGHTS.slice(0, barCount).map((h, i) => (
        <View
          key={i}
          style={[
            visualStyles.waveBar,
            {
              height: active ? h * 48 : 4,
              backgroundColor: active ? color : colors.border,
              opacity: active ? 0.7 + h * 0.3 : 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────
// Styles
// ─────────────────────────────────────────
export const visualStyles = StyleSheet.create({
  // WaterBottle
  bottleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    flexDirection: 'row',
    gap: spacing.md,
  },
  bottleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 290,
  },
  bottleBadge: {
    position: 'absolute',
    bottom: 30,
    backgroundColor: 'rgba(17, 22, 34, 0.85)',
    borderWidth: 1,
    borderColor: '#1D2433',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...shadow,
  },
  bottleBadgeText: {
    fontSize: type.small,
    fontWeight: fontWeight.black,
  },
  markers: {
    height: 264,
    marginTop: 18,
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 0,
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  markerText: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: fontWeight.bold,
    minWidth: 40,
    textAlign: 'right',
  },
  markerLine: {
    width: 8,
    height: 1,
    backgroundColor: colors.border,
  },

  // MiniBarChart
  chartContainer: {
    gap: spacing.xs,
  },
  chartRow: {
    height: 116,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
  },
  chartItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartTrack: {
    width: '100%',
    flex: 1,
    borderRadius: radius.xs,
    backgroundColor: '#223044',
    borderWidth: 1,
    borderColor: '#2A3A4F',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    position: 'relative',
  },
  chartTrackGloss: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    zIndex: 0,
  },
  goalLine: {
    position: 'absolute',
    left: -1,
    right: -1,
    height: 2,
    backgroundColor: colors.emerald,
    opacity: 0.42,
    zIndex: 1,
  },
  chartBar: {
    width: '100%',
    position: 'relative',
    borderTopLeftRadius: radius.xs,
    borderTopRightRadius: radius.xs,
    minHeight: 6,
    overflow: 'hidden',
  },
  chartBarGoal: {
    shadowColor: colors.emerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  chartBarSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  chartBarEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  chartLabel: {
    color: colors.muted,
    fontSize: type.micro,
    fontWeight: fontWeight.bold,
  },
  chartLabelGoal: {
    color: colors.inkSoft,
  },

  // ScoreRing
  scoreValue: {
    fontSize: 30,
    fontWeight: fontWeight.black,
    letterSpacing: 0,
  },
  scoreLabel: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  scoreSublabel: {
    color: colors.subtle,
    fontSize: type.micro,
    marginTop: 2,
  },

  // SleepStagesBar
  stagesWrap: { gap: spacing.md },
  stagesBar: {
    height: 14,
    borderRadius: 99,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: colors.track,
  },
  stageSegment: { height: 14 },
  stagesLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stageLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageLegendLabel: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  stageLegendValue: {
    color: colors.ink,
    fontSize: type.small,
    fontWeight: fontWeight.extrabold,
  },

  // MacroRing
  macroRingWrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  macroRingValue: {
    fontSize: 13,
    fontWeight: fontWeight.black,
    letterSpacing: 0,
  },
  macroRingLabel: {
    color: colors.muted,
    fontSize: type.micro,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },

  // WaveformBars
  waveformWrap: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    minHeight: 4,
  },
});
