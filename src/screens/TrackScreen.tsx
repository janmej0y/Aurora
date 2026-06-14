import { useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { BedDouble, Droplets, Moon, Plus, Salad, Utensils } from 'lucide-react-native';

import { Button, Field, MetricTile, Pill, ProgressBar, Screen, SectionHeader, SegmentedControl } from '../components/ui';
import { MiniBarChart, WaterBottle } from '../components/visuals';
import { useFadeIn } from '../hooks/useFadeIn';
import { useHealth } from '../store/HealthContext';
import { MealType } from '../types/health';
import { colors, radius, shadow, spacing, type } from '../theme/tokens';

type TrackMode = 'Hydration' | 'Sleep' | 'Nutrition';

const modeOptions = [
  { label: 'Hydration' as TrackMode, icon: Droplets },
  { label: 'Sleep' as TrackMode, icon: BedDouble },
  { label: 'Nutrition' as TrackMode, icon: Salad },
];

const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export function TrackScreen() {
  const [mode, setMode] = useState<TrackMode>('Hydration');
  const fade = useFadeIn();

  return (
    <Screen keyboard>
      <Animated.View style={[trackStyles.header, fade]}>
        <Text style={trackStyles.eyebrow}>Track</Text>
        <Text style={trackStyles.title}>Small logs, useful patterns.</Text>
      </Animated.View>

      <SegmentedControl<TrackMode> value={mode} onChange={setMode} options={modeOptions} />

      {mode === 'Hydration' ? <HydrationPanel /> : null}
      {mode === 'Sleep' ? <SleepPanel /> : null}
      {mode === 'Nutrition' ? <NutritionPanel /> : null}
    </Screen>
  );
}

function HydrationPanel() {
  const { state, addWater } = useHealth();
  const [custom, setCustom] = useState('');
  const progress = Math.min(100, Math.round((state.hydration.currentMl / state.hydration.goalMl) * 100));
  const remaining = Math.max(0, state.hydration.goalMl - state.hydration.currentMl);
  const history = state.hydration.history.slice(-7);
  const labels = history.map((item) => new Date(`${item.date}T00:00:00`).toLocaleDateString('en', { weekday: 'short' }).slice(0, 1));

  const addCustom = () => {
    addWater(Number(custom));
    setCustom('');
  };

  return (
    <View style={trackStyles.panel}>
      <SectionHeader title="Virtual bottle" eyebrow="Hydration" />
      <WaterBottle progress={progress} amountMl={state.hydration.currentMl} goalMl={state.hydration.goalMl} />

      <View style={trackStyles.progressBlock}>
        <View style={trackStyles.betweenRow}>
          <Text style={trackStyles.statTitle}>{remaining} ml remaining</Text>
          <Text style={trackStyles.statMuted}>{progress}%</Text>
        </View>
        <ProgressBar value={progress} accent={colors.blue} track="#EAF4FB" />
      </View>

      <View style={trackStyles.quickGrid}>
        {[150, 250, 500, 750].map((amount) => (
          <Button key={amount} compact variant="secondary" icon={Plus} onPress={() => addWater(amount)}>
            {amount} ml
          </Button>
        ))}
      </View>

      <View style={trackStyles.inlineForm}>
        <Field
          label="Custom amount"
          value={custom}
          onChangeText={setCustom}
          keyboardType="numeric"
          placeholder="350"
          containerStyle={trackStyles.inlineField}
        />
        <Button compact icon={Droplets} onPress={addCustom} disabled={!Number(custom)}>
          Add
        </Button>
      </View>

      <SectionHeader title="Seven day history" />
      <MiniBarChart values={history.map((item) => item.amountMl)} max={state.hydration.goalMl} color={colors.blue} labels={labels} />

      <View style={trackStyles.insightStrip}>
        <Text style={trackStyles.insightTitle}>Hydration insight</Text>
        <Text style={trackStyles.insightText}>
          You are {progress >= 55 ? 'ahead of your usual midday pace' : "still early in today's goal"}. One steady glass now keeps the evening lighter.
        </Text>
      </View>
    </View>
  );
}

function SleepPanel() {
  const { state, logSleep } = useHealth();
  const [hours, setHours] = useState(String(state.sleep.lastHours));
  const logs = state.sleep.logs.slice(0, 7).reverse();
  const labels = logs.map((log) => new Date(`${log.date}T00:00:00`).toLocaleDateString('en', { weekday: 'short' }).slice(0, 1));

  return (
    <View style={trackStyles.panel}>
      <SectionHeader title="Sleep analysis" eyebrow="Recovery" />
      <View style={trackStyles.metricGrid}>
        <MetricTile icon={Moon} label="Last night" value={`${state.sleep.lastHours}h`} detail="Logged duration" accent={colors.lilac} />
        <MetricTile icon={BedDouble} label="Average" value={`${state.sleep.weeklyAverage}h`} detail={`${state.sleep.consistency}% consistency`} accent={colors.blue} />
      </View>

      <View style={trackStyles.inlineForm}>
        <Field
          label="Sleep duration"
          value={hours}
          onChangeText={setHours}
          keyboardType="numeric"
          placeholder="7.5"
          containerStyle={trackStyles.inlineField}
        />
        <Button compact icon={Moon} onPress={() => logSleep(Number(hours))} disabled={!Number(hours)}>
          Log
        </Button>
      </View>

      <SectionHeader title="Weekly trend" />
      <MiniBarChart values={logs.map((log) => log.hours)} max={9} color={colors.lilac} labels={labels} />

      <View style={trackStyles.insightStrip}>
        <Text style={trackStyles.insightTitle}>Sleep insight</Text>
        <Text style={trackStyles.insightText}>
          Your best nights cluster near {state.user.bedtime}. Keeping the same wind-down window is more useful than chasing a perfect number.
        </Text>
      </View>
    </View>
  );
}

function NutritionPanel() {
  const { state, addMeal } = useHealth();
  const [typeValue, setTypeValue] = useState<MealType>('Breakfast');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const mealsToday = state.meals.filter((meal) => meal.date === today);
  const totals = useMemo(
    () =>
      mealsToday.reduce(
        (sum, meal) => ({
          calories: sum.calories + meal.calories,
          protein: sum.protein + meal.protein,
          carbs: sum.carbs + meal.carbs,
          fat: sum.fat + meal.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [mealsToday],
  );

  const submit = () => {
    addMeal({
      type: typeValue,
      name: name.trim() || `${typeValue} entry`,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
    });
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
  };

  return (
    <View style={trackStyles.panel}>
      <SectionHeader title="Nutrition awareness" eyebrow="Meals" />
      <View style={trackStyles.macroRow}>
        <View style={trackStyles.macroBox}>
          <Text style={trackStyles.macroValue}>{totals.calories}</Text>
          <Text style={trackStyles.macroLabel}>Calories</Text>
        </View>
        <View style={trackStyles.macroBox}>
          <Text style={trackStyles.macroValue}>{totals.protein}g</Text>
          <Text style={trackStyles.macroLabel}>Protein</Text>
        </View>
        <View style={trackStyles.macroBox}>
          <Text style={trackStyles.macroValue}>{totals.carbs}g</Text>
          <Text style={trackStyles.macroLabel}>Carbs</Text>
        </View>
        <View style={trackStyles.macroBox}>
          <Text style={trackStyles.macroValue}>{totals.fat}g</Text>
          <Text style={trackStyles.macroLabel}>Fat</Text>
        </View>
      </View>

      <View style={trackStyles.pillWrap}>
        {mealTypes.map((mealType) => (
          <Pill
            key={mealType}
            label={mealType}
            selected={typeValue === mealType}
            onPress={() => setTypeValue(mealType)}
            icon={Utensils}
          />
        ))}
      </View>

      <Field label="Meal" value={name} onChangeText={setName} placeholder="Oats, banana, and nuts" />
      <View style={trackStyles.row}>
        <Field label="Calories" value={calories} onChangeText={setCalories} keyboardType="numeric" containerStyle={trackStyles.rowField} />
        <Field label="Protein" value={protein} onChangeText={setProtein} keyboardType="numeric" containerStyle={trackStyles.rowField} />
      </View>
      <View style={trackStyles.row}>
        <Field label="Carbs" value={carbs} onChangeText={setCarbs} keyboardType="numeric" containerStyle={trackStyles.rowField} />
        <Field label="Fat" value={fat} onChangeText={setFat} keyboardType="numeric" containerStyle={trackStyles.rowField} />
      </View>
      <Button icon={Salad} onPress={submit}>Log meal</Button>

      <SectionHeader title="Meals today" />
      <View style={trackStyles.mealList}>
        {mealsToday.map((meal) => (
          <View key={meal.id} style={trackStyles.mealRow}>
            <View>
              <Text style={trackStyles.mealTitle}>{meal.name}</Text>
              <Text style={trackStyles.mealMeta}>{meal.type} - {meal.protein}g protein - {meal.calories} kcal</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const trackStyles = StyleSheet.create({
  header: {
    gap: spacing.xs,
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
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: 0,
  },
  panel: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadow,
  },
  progressBlock: {
    gap: spacing.sm,
  },
  betweenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '900',
  },
  statMuted: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: '800',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inlineForm: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  inlineField: {
    flex: 1,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  insightStrip: {
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.surface2,
    gap: spacing.xs,
  },
  insightTitle: {
    color: colors.ink,
    fontSize: type.small,
    fontWeight: '900',
  },
  insightText: {
    color: colors.muted,
    fontSize: type.small,
    lineHeight: 20,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroBox: {
    flex: 1,
    minHeight: 76,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  macroValue: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '900',
  },
  macroLabel: {
    color: colors.muted,
    fontSize: type.micro,
    fontWeight: '800',
    marginTop: 2,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowField: {
    flex: 1,
  },
  mealList: {
    gap: spacing.sm,
  },
  mealRow: {
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    justifyContent: 'center',
  },
  mealTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '900',
  },
  mealMeta: {
    color: colors.muted,
    fontSize: type.small,
    marginTop: 2,
  },
});
