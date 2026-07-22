import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { enterFade, exitFade } from '@/constants/motion';
import { colors, iconSize, radius, shadow, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import type { NutritionInfo } from '@/types/nutrition';
import type { MealType, Recipe } from '@/types/recipe';
import { normalizeIngredient } from '@/utils/normalizeIngredient';
import { parseToCents } from '@/utils/money';

export interface CustomMealDetails {
  name: string;
  servings?: number;
  time?: string;
  nutrition?: NutritionInfo;
  estimatedCostCents?: number;
  notes?: string;
}

type AddMealModalProps = {
  visible: boolean;
  mealSlot: MealType;
  recipes: Recipe[];
  onClose: () => void;
  onSelectRecipe: (recipeId: string) => void;
  onAddCustom: (details: CustomMealDetails) => void;
  /** Hides the estimated-cost field entirely when Budget Mode is off. */
  budgetModeEnabled?: boolean;
};

function parseOptionalNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isNaN(value) ? undefined : value;
}

/** A focused way to fill one meal slot — search a saved recipe, or add a quick custom meal with no recipe at all. */
export function AddMealModal({ visible, mealSlot, recipes, onClose, onSelectRecipe, onAddCustom, budgetModeEnabled }: AddMealModalProps) {
  const reducedMotion = useReducedMotionPreference();
  const [query, setQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [servings, setServings] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [time, setTime] = useState('');
  const [kcal, setKcal] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [notes, setNotes] = useState('');

  const matches = useMemo(() => {
    if (!query.trim()) return recipes.slice(0, 20);
    const q = normalizeIngredient(query);
    return recipes.filter((recipe) => normalizeIngredient(recipe.name).includes(q)).slice(0, 20);
  }, [recipes, query]);

  function close() {
    setQuery('');
    setCustomName('');
    setServings('');
    setShowMore(false);
    setTime('');
    setKcal('');
    setEstimatedCost('');
    setNotes('');
    onClose();
  }

  function submitCustom() {
    const trimmedName = customName.trim();
    if (!trimmedName) return;
    const kcalValue = parseOptionalNumber(kcal);
    onAddCustom({
      name: trimmedName,
      servings: parseOptionalNumber(servings),
      time: time.trim() || undefined,
      nutrition: kcalValue != null ? { kcal: kcalValue, source: 'user-entered', completeness: 'partial' } : undefined,
      estimatedCostCents: parseToCents(estimatedCost) ?? undefined,
      notes: notes.trim() || undefined,
    });
    close();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <SafeAreaView edges={['bottom']}>
              <View style={styles.sheet}>
                <View style={styles.handle} />
                <View style={styles.headerRow}>
                  <Text style={styles.title}>Add {mealSlot}</Text>
                  <IconButton icon="close" accessibilityLabel="Close" onPress={close} />
                </View>
                <TextField placeholder="Search your recipes" value={query} onChangeText={setQuery} autoFocus />

                <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                  {matches.map((recipe) => (
                    <Pressable
                      key={recipe.id}
                      style={({ pressed }) => [styles.recipeRow, pressed && styles.rowPressed]}
                      onPress={() => {
                        onSelectRecipe(recipe.id);
                        close();
                      }}>
                      <Text style={styles.recipeName} numberOfLines={1}>
                        {recipe.name}
                      </Text>
                      <Text style={styles.recipeMeta}>{recipe.time} min</Text>
                    </Pressable>
                  ))}
                  {matches.length === 0 && <Text style={styles.emptyText}>No recipes match "{query}".</Text>}
                </ScrollView>

                <Text style={styles.customLabel}>Or a custom meal</Text>
                <View style={styles.row}>
                  <TextField placeholder="e.g. Leftovers" value={customName} onChangeText={setCustomName} style={styles.customNameField} />
                  <TextField placeholder="Servings" value={servings} onChangeText={setServings} keyboardType="numeric" style={styles.servingsField} />
                </View>

                <Pressable onPress={() => setShowMore(!showMore)} hitSlop={8}>
                  <Text style={styles.expandLink}>{showMore ? 'Hide more options' : 'More options (time, calories, notes)'}</Text>
                </Pressable>

                {showMore && (
                  <Animated.View style={styles.moreOptions} entering={enterFade(reducedMotion)} exiting={exitFade(reducedMotion)}>
                    <View style={styles.row}>
                      <TextField placeholder="Time, e.g. 18:30" value={time} onChangeText={setTime} style={styles.half} />
                      <TextField placeholder="Calories (kcal)" value={kcal} onChangeText={setKcal} keyboardType="numeric" style={styles.half} />
                    </View>
                    {budgetModeEnabled && (
                      <TextField
                        placeholder="Estimated cost, e.g. 6.50"
                        value={estimatedCost}
                        onChangeText={setEstimatedCost}
                        keyboardType="numeric"
                      />
                    )}
                    <TextField placeholder="Notes (optional)" value={notes} onChangeText={setNotes} />
                  </Animated.View>
                )}

                <Button label="Add custom meal" compact disabled={!customName.trim()} onPress={submitCustom} />
              </View>
            </SafeAreaView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    maxHeight: '85%',
    ...shadow.card,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.role.cardTitle,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  list: {
    maxHeight: 200,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowPressed: {
    opacity: 0.6,
  },
  recipeName: {
    ...typography.role.body,
    color: colors.textPrimary,
    flex: 1,
  },
  recipeMeta: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  emptyText: {
    ...typography.role.bodySecondary,
    color: colors.textTertiary,
    paddingVertical: spacing.md,
  },
  customLabel: {
    ...typography.role.label,
    color: colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  customNameField: {
    flex: 2,
  },
  servingsField: {
    flex: 1,
  },
  half: {
    flex: 1,
  },
  expandLink: {
    ...typography.role.label,
    color: colors.accentBlue,
  },
  moreOptions: {
    gap: spacing.sm,
  },
});
