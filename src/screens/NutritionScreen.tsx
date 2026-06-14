import { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Info, Plus, Trash2, Utensils, X } from 'lucide-react-native';

import { MacroRing } from '../components/visuals';
import { useHealth } from '../store/HealthContext';
import { MealType } from '../types/health';
import { colors, fontWeight, radius, shadow, spacing, type } from '../theme/tokens';

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MEAL_ICONS: Record<MealType, string> = {
  Breakfast: '🌅',
  Lunch: '☀️',
  Dinner: '🌙',
  Snack: '🍎',
};
const MEAL_COLORS: Record<MealType, string> = {
  Breakfast: colors.amber,
  Lunch: colors.emerald,
  Dinner: colors.lilac,
  Snack: colors.coral,
};

const CALORIE_GOAL = 2400;
const PROTEIN_GOAL = 120;
const CARB_GOAL = 300;
const FAT_GOAL = 80;

export function NutritionScreen() {
  const { state, addMeal, deleteMeal } = useHealth();
  const navigation = useNavigation<any>();
  const [showAddModal, setShowAddModal] = useState(false);
  const [mealType, setMealType] = useState<MealType>('Breakfast');
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const mealsToday = state.meals.filter((m) => m.date === today);

  const totals = useMemo(() => mealsToday.reduce(
    (s, m) => ({ calories: s.calories + m.calories, protein: s.protein + m.protein, carbs: s.carbs + m.carbs, fat: s.fat + m.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ), [mealsToday]);

  const mealsByType = useMemo(() => MEAL_TYPES.reduce((acc, t) => ({
    ...acc,
    [t]: mealsToday.filter((m) => m.type === t),
  }), {} as Record<MealType, typeof mealsToday>), [mealsToday]);

  const handleAdd = () => {
    addMeal({
      type: mealType,
      name: mealName.trim() || `${mealType} entry`,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
    });
    setMealName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setShowAddModal(false);
  };

  const calPct = Math.min(100, Math.round((totals.calories / CALORIE_GOAL) * 100));

  return (
    <SafeAreaView style={nutStyles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={nutStyles.scroll}>
        {/* Header */}
        <View style={nutStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={nutStyles.backBtn} accessibilityLabel="Back">
            <ChevronLeft size={20} color={colors.ink} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={nutStyles.headerTitle}>Nutrition</Text>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={nutStyles.addBtn}
            accessibilityLabel="Add meal"
          >
            <Plus size={18} color={colors.amber} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Date Switcher */}
        <View style={nutStyles.dateSwitcher}>
          <TouchableOpacity><Text style={nutStyles.dateSwitcherArrow}>‹</Text></TouchableOpacity>
          <Text style={nutStyles.dateSwitcherText}>Today</Text>
          <TouchableOpacity><Text style={nutStyles.dateSwitcherArrow}>›</Text></TouchableOpacity>
        </View>

        {/* Calories Card */}
        <View style={nutStyles.caloriesCard}>
          <View style={nutStyles.calTextRow}>
            <View>
              <Text style={nutStyles.calValueText}>
                {totals.calories.toLocaleString()} <Text style={nutStyles.calValueUnit}>kcal</Text>
              </Text>
              <Text style={nutStyles.calGoalText}>of {CALORIE_GOAL.toLocaleString()} kcal</Text>
            </View>
            <Text style={nutStyles.calPctText}>{calPct}%</Text>
          </View>
          <View style={nutStyles.progressTrack}>
            <View style={[nutStyles.progressBarFill, { width: `${calPct}%` }]} />
          </View>
        </View>

        {/* Macro donut rings */}
        <View style={nutStyles.macroRingsCard}>
          <MacroRing value={totals.protein} max={PROTEIN_GOAL} label="Protein" unit="g" color={colors.blue} />
          <MacroRing value={totals.carbs} max={CARB_GOAL} label="Carbs" unit="g" color={colors.emerald} />
          <MacroRing value={totals.fat} max={FAT_GOAL} label="Fat" unit="g" color={colors.coral} />
        </View>

        {/* Meals slot list Card */}
        <View style={nutStyles.mealsCard}>
          <Text style={nutStyles.mealsCardTitle}>Meals</Text>
          {mealsToday.length === 0 && (
            <View style={nutStyles.mealsEmpty}>
              <Text style={nutStyles.mealsEmptyText}>No meals logged yet — tap + to add your first entry</Text>
            </View>
          )}
          <View style={nutStyles.mealsList}>
            {MEAL_TYPES.map((mType) => {
              const meals = mealsByType[mType];
              const typeTotal = meals.reduce((s, m) => s + m.calories, 0);
              return (
                <View key={mType} style={nutStyles.mealSlotRow}>
                  <View style={nutStyles.mealSlotHeader}>
                    <View style={nutStyles.mealSlotLeft}>
                      <Text style={nutStyles.mealSlotEmoji}>{MEAL_ICONS[mType]}</Text>
                      <Text style={nutStyles.mealSlotLabel}>{mType}</Text>
                    </View>
                    <View style={nutStyles.mealSlotRight}>
                      <Text style={nutStyles.mealSlotCalories}>
                        {typeTotal > 0 ? `${typeTotal} kcal` : '0 kcal'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => { setMealType(mType); setShowAddModal(true); }}
                        style={nutStyles.mealSlotAdd}
                        accessibilityLabel={`Add ${mType}`}
                      >
                        <Plus size={12} color={colors.amber} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Meal sub-items if logged */}
                  {meals.length > 0 && (
                    <View style={nutStyles.mealSubItems}>
                      {meals.map((meal) => (
                        <View key={meal.id} style={nutStyles.mealSubRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={nutStyles.mealSubName}>{meal.name}</Text>
                            <Text style={nutStyles.mealSubMacros}>
                              {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F
                            </Text>
                          </View>
                          <Text style={nutStyles.mealSubCals}>{meal.calories} kcal</Text>
                          <TouchableOpacity
                            onPress={() => deleteMeal(meal.id)}
                            style={nutStyles.mealSubDelete}
                            accessibilityLabel="Delete entry"
                          >
                            <Trash2 size={12} color={colors.subtle} strokeWidth={2} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Insight */}
        <View style={nutStyles.insightCard}>
          <View style={nutStyles.insightIcon}>
            <Info size={16} color={colors.amber} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={nutStyles.insightLabel}>Nutrition Insight</Text>
            <Text style={nutStyles.insightText}>
              {totals.protein < PROTEIN_GOAL * 0.5
                ? `Protein is at ${totals.protein}g — consider adding a protein-rich snack or meal.`
                : totals.calories > CALORIE_GOAL * 0.9
                ? "You're close to your calorie target. Focus on protein-dense foods for the rest of the day."
                : "Your nutrition balance looks solid today. Keep meal frequency consistent for steady energy."}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Add Meal Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={nutStyles.modalOverlay}>
          <TouchableOpacity style={nutStyles.modalBackdrop} onPress={() => setShowAddModal(false)} activeOpacity={1} />
          <ScrollView style={nutStyles.modalSheetScroll} contentContainerStyle={nutStyles.modalSheet} keyboardShouldPersistTaps="handled">
            <View style={nutStyles.modalHandle} />
            <View style={nutStyles.modalHeader}>
              <Text style={nutStyles.modalTitle}>Log Meal</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} accessibilityLabel="Close">
                <X size={18} color={colors.muted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Meal type */}
            <View style={nutStyles.typeRow}>
              {MEAL_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setMealType(t)}
                  style={[nutStyles.typeBtn, mealType === t && { backgroundColor: `${MEAL_COLORS[t]}20`, borderColor: MEAL_COLORS[t] }]}
                  accessibilityLabel={t}
                >
                  <Text style={nutStyles.typeEmoji}>{MEAL_ICONS[t]}</Text>
                  <Text style={[nutStyles.typeBtnText, mealType === t && { color: MEAL_COLORS[t] }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={nutStyles.modalField}>
              <Text style={nutStyles.modalLabel}>Meal name</Text>
              <TextInput
                value={mealName}
                onChangeText={setMealName}
                placeholder="e.g. Oats & banana"
                placeholderTextColor={colors.subtle}
                style={nutStyles.modalInput}
              />
            </View>

            <View style={nutStyles.modalRow}>
              <View style={[nutStyles.modalField, { flex: 1 }]}>
                <Text style={nutStyles.modalLabel}>Calories</Text>
                <TextInput value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="350" placeholderTextColor={colors.subtle} style={nutStyles.modalInput} />
              </View>
              <View style={[nutStyles.modalField, { flex: 1 }]}>
                <Text style={nutStyles.modalLabel}>Protein (g)</Text>
                <TextInput value={protein} onChangeText={setProtein} keyboardType="numeric" placeholder="25" placeholderTextColor={colors.subtle} style={nutStyles.modalInput} />
              </View>
            </View>
            <View style={nutStyles.modalRow}>
              <View style={[nutStyles.modalField, { flex: 1 }]}>
                <Text style={nutStyles.modalLabel}>Carbs (g)</Text>
                <TextInput value={carbs} onChangeText={setCarbs} keyboardType="numeric" placeholder="40" placeholderTextColor={colors.subtle} style={nutStyles.modalInput} />
              </View>
              <View style={[nutStyles.modalField, { flex: 1 }]}>
                <Text style={nutStyles.modalLabel}>Fat (g)</Text>
                <TextInput value={fat} onChangeText={setFat} keyboardType="numeric" placeholder="10" placeholderTextColor={colors.subtle} style={nutStyles.modalInput} />
              </View>
            </View>

            <TouchableOpacity onPress={handleAdd} style={nutStyles.modalAddBtn} accessibilityLabel="Log meal">
              <Text style={nutStyles.modalAddBtnText}>Log {mealType}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const nutStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 110,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.ink,
    fontSize: type.body + 2,
    fontWeight: fontWeight.black,
    textAlign: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  dateSwitcherArrow: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: fontWeight.bold,
  },
  dateSwitcherText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.extrabold,
  },
  caloriesCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  calTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calValueText: {
    color: colors.amber,
    fontSize: type.hero - 6,
    fontWeight: fontWeight.black,
  },
  calValueUnit: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.bold,
  },
  calGoalText: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  calPctText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.black,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.amber,
  },
  macroRingsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    ...shadow,
  },
  mealsCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  mealsCardTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.black,
  },
  mealsEmpty: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  mealsEmptyText: {
    color: colors.muted,
    fontSize: type.small,
    lineHeight: 20,
  },
  mealsList: {
    gap: spacing.md,
  },
  mealSlotRow: {
    gap: spacing.xs,
  },
  mealSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealSlotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealSlotEmoji: {
    fontSize: 16,
  },
  mealSlotLabel: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.extrabold,
  },
  mealSlotRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealSlotCalories: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  mealSlotAdd: {
    width: 26,
    height: 26,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealSubItems: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  mealSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  mealSubName: {
    color: colors.ink,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  mealSubMacros: {
    color: colors.muted,
    fontSize: type.micro,
    marginTop: 1,
  },
  mealSubCals: {
    color: colors.inkSoft,
    fontSize: type.small,
    fontWeight: fontWeight.extrabold,
  },
  mealSubDelete: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.amberSoft,
    backgroundColor: colors.amberSoft,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: `${colors.amber}20`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  insightLabel: {
    color: colors.amber,
    fontSize: type.micro,
    fontWeight: fontWeight.black,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  insightText: { color: colors.inkSoft, fontSize: type.small, lineHeight: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  modalSheetScroll: { maxHeight: '85%' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: colors.ink, fontSize: type.section, fontWeight: fontWeight.black },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    gap: 3,
  },
  typeEmoji: { fontSize: 16 },
  typeBtnText: { color: colors.muted, fontSize: type.micro, fontWeight: fontWeight.extrabold },
  modalField: { gap: spacing.sm },
  modalLabel: { color: colors.inkSoft, fontSize: type.small, fontWeight: fontWeight.bold },
  modalInput: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.lg,
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.semibold,
  },
  modalRow: { flexDirection: 'row', gap: spacing.md },
  modalAddBtn: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAddBtnText: { color: colors.background, fontSize: type.body, fontWeight: fontWeight.black },
});
