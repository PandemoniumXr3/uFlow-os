import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { EFFORT_OPTIONS, MEAL_CATEGORY_OPTIONS, MEAL_TYPE_OPTIONS } from '@/constants/mealOptions';
import { enterFade, exitFade, layoutTransition } from '@/constants/motion';
import { colors, iconSize, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import type { NutritionCompleteness, NutritionInfo } from '@/types/nutrition';
import type { Effort, MealCategory, MealType, NewRecipe, RecipeIngredientLine } from '@/types/recipe';

type AddRecipeFormProps = {
  onSubmit: (input: NewRecipe) => void;
  onCancel?: () => void;
  /** Hide the whole "Add nutrition manually" section when Nutrition Tracking is off — no pressure to fill it in. */
  nutritionTrackingEnabled: boolean;
  /** Hide the optional quantity/unit fields entirely when Budget Mode is off. */
  budgetModeEnabled?: boolean;
};

const ALL_FIELD_COUNT = 8;

function parseOptionalNumber(text: string | undefined): number | undefined {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isNaN(value) ? undefined : value;
}

function buildManualNutrition(fields: Record<string, string>): NutritionInfo | undefined {
  const kcal = parseOptionalNumber(fields.kcal);
  const proteinGrams = parseOptionalNumber(fields.protein);
  const carbohydrateGrams = parseOptionalNumber(fields.carbs);
  const fatGrams = parseOptionalNumber(fields.fat);
  const saturatedFatGrams = parseOptionalNumber(fields.saturatedFat);
  const fiberGrams = parseOptionalNumber(fields.fiber);
  const sugarGrams = parseOptionalNumber(fields.sugar);
  const sodiumMilligrams = parseOptionalNumber(fields.sodium);

  const values = [kcal, proteinGrams, carbohydrateGrams, fatGrams, saturatedFatGrams, fiberGrams, sugarGrams, sodiumMilligrams];
  const providedCount = values.filter((v) => v != null).length;
  if (providedCount === 0) return undefined;

  const completeness: NutritionCompleteness = providedCount === ALL_FIELD_COUNT ? 'complete' : 'partial';

  return {
    kcal,
    proteinGrams,
    carbohydrateGrams,
    fatGrams,
    saturatedFatGrams,
    fiberGrams,
    sugarGrams,
    sodiumMilligrams,
    source: 'user-entered',
    completeness,
  };
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function AddRecipeForm({ onSubmit, onCancel, nutritionTrackingEnabled, budgetModeEnabled }: AddRecipeFormProps) {
  const reducedMotion = useReducedMotionPreference();
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType[]>([]);
  const [time, setTime] = useState('');
  const [servings, setServings] = useState('');
  const [effort, setEffort] = useState<Effort>('medium');

  const [ingredientDraft, setIngredientDraft] = useState('');
  const [ingredientQtyDraft, setIngredientQtyDraft] = useState('');
  const [ingredientUnitDraft, setIngredientUnitDraft] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  // Parallel to `ingredients` (same index), so removing an ingredient removes its line cleanly even with duplicate names.
  const [ingredientLineDrafts, setIngredientLineDrafts] = useState<(Pick<RecipeIngredientLine, 'quantity' | 'unit'> | undefined)[]>([]);

  const [showDetails, setShowDetails] = useState(false);
  const [categories, setCategories] = useState<MealCategory[]>([]);
  const [instructions, setInstructions] = useState('');

  const [showNutritionForm, setShowNutritionForm] = useState(false);
  const [showAdvancedNutrition, setShowAdvancedNutrition] = useState(false);
  const [nutritionFields, setNutritionFields] = useState<Record<string, string>>({});

  const canSubmit = name.trim().length > 0 && mealType.length > 0 && time.trim().length > 0 && ingredients.length > 0;

  function setNutritionField(key: string, value: string) {
    setNutritionFields((current) => ({ ...current, [key]: value }));
  }

  function addIngredient() {
    const trimmed = ingredientDraft.trim();
    if (!trimmed) return;
    const quantity = parseOptionalNumber(ingredientQtyDraft);
    const unit = ingredientUnitDraft.trim() || undefined;
    setIngredients((current) => [...current, trimmed]);
    setIngredientLineDrafts((current) => [...current, quantity != null || unit ? { quantity, unit } : undefined]);
    setIngredientDraft('');
    setIngredientQtyDraft('');
    setIngredientUnitDraft('');
  }

  function removeIngredient(index: number) {
    setIngredients((current) => current.filter((_, i) => i !== index));
    setIngredientLineDrafts((current) => current.filter((_, i) => i !== index));
  }

  const handleSubmit = () => {
    if (!canSubmit) return;

    const ingredientLines: RecipeIngredientLine[] = [];
    ingredients.forEach((name, index) => {
      const line = ingredientLineDrafts[index];
      if (line) ingredientLines.push({ name, quantity: line.quantity, unit: line.unit });
    });

    onSubmit({
      name,
      mealType,
      categories,
      ingredients,
      instructions: instructions.trim() || undefined,
      effort,
      time: Number(time),
      servings: parseOptionalNumber(servings),
      nutrition: buildManualNutrition(nutritionFields),
      ingredientLines: ingredientLines.length > 0 ? ingredientLines : undefined,
    });

    setName('');
    setMealType([]);
    setCategories([]);
    setIngredientDraft('');
    setIngredientQtyDraft('');
    setIngredientUnitDraft('');
    setIngredients([]);
    setIngredientLineDrafts([]);
    setInstructions('');
    setEffort('medium');
    setTime('');
    setServings('');
    setNutritionFields({});
    setShowDetails(false);
    setShowNutritionForm(false);
    setShowAdvancedNutrition(false);
  };

  return (
    <Card variant="standard" style={styles.container}>
      <Text style={styles.heading}>New recipe</Text>
      <TextField value={name} onChangeText={setName} placeholder="Meal name…" />

      <Text style={styles.label}>When</Text>
      <View style={styles.chipRow}>
        {MEAL_TYPE_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={mealType.includes(option.value)}
            onPress={() => setMealType(toggleValue(mealType, option.value))}
          />
        ))}
      </View>

      <View style={styles.row}>
        <TextField value={time} onChangeText={setTime} placeholder="Time (min)" keyboardType="numeric" style={styles.half} />
        <TextField value={servings} onChangeText={setServings} placeholder="Servings (optional)" keyboardType="numeric" style={styles.half} />
      </View>

      <Text style={styles.label}>Effort</Text>
      <View style={styles.chipRow}>
        {EFFORT_OPTIONS.map((option) => (
          <Chip key={option.value} label={option.label} selected={effort === option.value} onPress={() => setEffort(option.value)} />
        ))}
      </View>

      <Text style={styles.label}>Ingredients</Text>
      {ingredients.length > 0 && (
        <View style={styles.ingredientList}>
          {ingredients.map((ingredient, index) => (
            <Animated.View key={`${ingredient}-${index}`} style={styles.ingredientRow} entering={enterFade(reducedMotion)} layout={layoutTransition(reducedMotion)}>
              <Text style={styles.ingredientText} numberOfLines={1}>
                {ingredient}
              </Text>
              <Pressable onPress={() => removeIngredient(index)} hitSlop={8} accessibilityLabel={`Remove ${ingredient}`}>
                <Ionicons name="close" size={iconSize.sm} color={colors.textTertiary} />
              </Pressable>
            </Animated.View>
          ))}
        </View>
      )}
      <View style={styles.row}>
        <TextField
          value={ingredientDraft}
          onChangeText={setIngredientDraft}
          placeholder={budgetModeEnabled ? 'Ingredient name' : 'e.g. 2 cups flour'}
          style={styles.half}
          returnKeyType="done"
          onSubmitEditing={addIngredient}
        />
        <IconButton icon="add-circle" accessibilityLabel="Add ingredient" onPress={addIngredient} />
      </View>
      {budgetModeEnabled && (
        <View style={styles.row}>
          <TextField
            value={ingredientQtyDraft}
            onChangeText={setIngredientQtyDraft}
            placeholder="Qty (optional)"
            keyboardType="numeric"
            style={styles.half}
          />
          <TextField value={ingredientUnitDraft} onChangeText={setIngredientUnitDraft} placeholder="Unit (optional)" style={styles.half} />
        </View>
      )}

      <Pressable onPress={() => setShowDetails(!showDetails)} hitSlop={8}>
        <Text style={styles.expandLink}>{showDetails ? 'Hide instructions & tags' : 'Add instructions & tags (optional)'}</Text>
      </Pressable>

      {showDetails && (
        <Animated.View style={styles.detailsSection} entering={enterFade(reducedMotion)} exiting={exitFade(reducedMotion)} layout={layoutTransition(reducedMotion)}>
          <TextField value={instructions} onChangeText={setInstructions} placeholder="Instructions (optional)…" multiline style={styles.multiline} />

          <Text style={styles.label}>Dietary tags</Text>
          <View style={styles.chipRow}>
            {MEAL_CATEGORY_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={categories.includes(option.value)}
                onPress={() => setCategories(toggleValue(categories, option.value))}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {nutritionTrackingEnabled && (
        <Animated.View layout={layoutTransition(reducedMotion)}>
          <Pressable onPress={() => setShowNutritionForm(!showNutritionForm)} hitSlop={8}>
            <Text style={styles.expandLink}>{showNutritionForm ? 'Hide nutrition' : 'Add nutrition manually (optional)'}</Text>
          </Pressable>
          {showNutritionForm && (
            <Animated.View style={styles.nutritionForm} entering={enterFade(reducedMotion)} exiting={exitFade(reducedMotion)}>
              <Text style={styles.hint}>Optional — leave blank whatever you don't know.</Text>
              <View style={styles.row}>
                <TextField
                  value={nutritionFields.kcal ?? ''}
                  onChangeText={(text) => setNutritionField('kcal', text)}
                  placeholder="Calories (kcal)"
                  keyboardType="numeric"
                  style={styles.half}
                />
                <TextField
                  value={nutritionFields.protein ?? ''}
                  onChangeText={(text) => setNutritionField('protein', text)}
                  placeholder="Protein (g)"
                  keyboardType="numeric"
                  style={styles.half}
                />
              </View>
              <View style={styles.row}>
                <TextField
                  value={nutritionFields.carbs ?? ''}
                  onChangeText={(text) => setNutritionField('carbs', text)}
                  placeholder="Carbs (g)"
                  keyboardType="numeric"
                  style={styles.half}
                />
                <TextField
                  value={nutritionFields.fat ?? ''}
                  onChangeText={(text) => setNutritionField('fat', text)}
                  placeholder="Fat (g)"
                  keyboardType="numeric"
                  style={styles.half}
                />
              </View>

              <Pressable onPress={() => setShowAdvancedNutrition(!showAdvancedNutrition)} hitSlop={8}>
                <Text style={styles.expandLink}>{showAdvancedNutrition ? 'Hide advanced' : 'Advanced (optional)'}</Text>
              </Pressable>
              {showAdvancedNutrition && (
                <Animated.View entering={enterFade(reducedMotion)} exiting={exitFade(reducedMotion)} style={styles.nutritionForm}>
                  <View style={styles.row}>
                    <TextField
                      value={nutritionFields.saturatedFat ?? ''}
                      onChangeText={(text) => setNutritionField('saturatedFat', text)}
                      placeholder="Saturated fat (g)"
                      keyboardType="numeric"
                      style={styles.half}
                    />
                    <TextField
                      value={nutritionFields.fiber ?? ''}
                      onChangeText={(text) => setNutritionField('fiber', text)}
                      placeholder="Fiber (g)"
                      keyboardType="numeric"
                      style={styles.half}
                    />
                  </View>
                  <View style={styles.row}>
                    <TextField
                      value={nutritionFields.sugar ?? ''}
                      onChangeText={(text) => setNutritionField('sugar', text)}
                      placeholder="Sugar (g)"
                      keyboardType="numeric"
                      style={styles.half}
                    />
                    <TextField
                      value={nutritionFields.sodium ?? ''}
                      onChangeText={(text) => setNutritionField('sodium', text)}
                      placeholder="Sodium (mg)"
                      keyboardType="numeric"
                      style={styles.half}
                    />
                  </View>
                </Animated.View>
              )}
            </Animated.View>
          )}
        </Animated.View>
      )}

      <View style={styles.submitRow}>
        <Button label="Save meal" onPress={handleSubmit} disabled={!canSubmit} />
        {onCancel && <Button label="Cancel" variant="quiet" compact onPress={onCancel} />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  heading: {
    ...typography.role.sectionHeading,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  submitRow: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  multiline: {
    height: 80,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  ingredientList: {
    gap: spacing.xs,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  ingredientText: {
    ...typography.role.bodySecondary,
    color: colors.textPrimary,
    flex: 1,
  },
  expandLink: {
    ...typography.role.label,
    color: colors.accentBlue,
    marginTop: spacing.xs,
  },
  detailsSection: {
    gap: spacing.sm,
  },
  nutritionForm: {
    gap: spacing.sm,
  },
  hint: {
    color: colors.textTertiary,
    fontSize: typography.size.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  half: {
    flex: 1,
  },
});
