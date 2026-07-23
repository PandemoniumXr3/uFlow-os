import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { RecipeIngredientEditor } from '@/components/recipes/RecipeIngredientEditor';
import { RecipeInstructionEditor } from '@/components/recipes/RecipeInstructionEditor';
import { parseInstructionSteps } from '@/components/recipes/RecipeInstructionList';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField } from '@/components/ui/TextField';
import { EFFORT_OPTIONS, EQUIPMENT_OPTIONS, MEAL_CATEGORY_OPTIONS, MEAL_TYPE_OPTIONS } from '@/constants/mealOptions';
import { enterFade, exitFade, layoutTransition } from '@/constants/motion';
import { colors, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';
import type { NutritionCompleteness, NutritionInfo } from '@/types/nutrition';
import type { CookingEquipment, Effort, MealCategory, MealType, Recipe, RecipeIngredientLine } from '@/types/recipe';
import type { Product } from '@/types/product';
import { generateId } from '@/utils/id';
import { validateRecipeDraft } from '@/utils/validateRecipeDraft';

export interface RecipeDraft {
  name: string;
  mealType: MealType[];
  categories: MealCategory[];
  ingredients: string[];
  ingredientLines?: RecipeIngredientLine[];
  instructions?: string;
  effort: Effort;
  time: number;
  servings?: number;
  nutrition?: NutritionInfo;
  equipment?: CookingEquipment[];
  notes?: string;
}

type RecipeFormProps = {
  /** Present in Edit mode — prefills every field, including legacy recipes with no ingredientLines. */
  initialRecipe?: Recipe;
  products: Product[];
  onSubmit: (draft: RecipeDraft) => void;
  onCancel: () => void;
  nutritionTrackingEnabled: boolean;
  budgetModeEnabled: boolean;
};

const ALL_NUTRITION_FIELD_COUNT = 8;

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

  const completeness: NutritionCompleteness = providedCount === ALL_NUTRITION_FIELD_COUNT ? 'complete' : 'partial';

  return { kcal, proteinGrams, carbohydrateGrams, fatGrams, saturatedFatGrams, fiberGrams, sugarGrams, sodiumMilligrams, source: 'user-entered', completeness };
}

function nutritionToFields(nutrition: NutritionInfo | undefined): Record<string, string> {
  if (!nutrition) return {};
  const entries: [string, number | undefined][] = [
    ['kcal', nutrition.kcal],
    ['protein', nutrition.proteinGrams],
    ['carbs', nutrition.carbohydrateGrams],
    ['fat', nutrition.fatGrams],
    ['saturatedFat', nutrition.saturatedFatGrams],
    ['fiber', nutrition.fiberGrams],
    ['sugar', nutrition.sugarGrams],
    ['sodium', nutrition.sodiumMilligrams],
  ];
  const fields: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (value != null) fields[key] = String(value);
  }
  return fields;
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** Seeds ingredient rows from a recipe's structured lines, or (for a legacy recipe) its plain name list with no amounts — either way every row gets a stable id for the editor. */
function seedIngredientLines(recipe: Recipe | undefined): RecipeIngredientLine[] {
  if (!recipe) return [];
  if (recipe.ingredientLines && recipe.ingredientLines.length > 0) {
    return recipe.ingredientLines.map((line) => ({ ...line, id: line.id ?? generateId() }));
  }
  return recipe.ingredients.map((name) => ({ id: generateId(), name }));
}

/**
 * Sectioned, consumer-facing recipe form shared by Add and Edit — replaces
 * the old flat single-card form. Advanced fields (nutrition, equipment,
 * tags, notes) sit behind CollapsibleSection so a minimal recipe (name,
 * meal type, one ingredient, time) can be saved without ever opening them.
 */
export function RecipeForm({ initialRecipe, products, onSubmit, onCancel, nutritionTrackingEnabled, budgetModeEnabled }: RecipeFormProps) {
  const reducedMotion = useReducedMotionPreference();

  const [name, setName] = useState(initialRecipe?.name ?? '');
  const [mealType, setMealType] = useState<MealType[]>(initialRecipe?.mealType ?? []);
  const [time, setTime] = useState(initialRecipe ? String(initialRecipe.time) : '');
  const [servings, setServings] = useState(initialRecipe?.servings != null ? String(initialRecipe.servings) : '');
  const [effort, setEffort] = useState<Effort>(initialRecipe?.effort ?? 'medium');

  const [ingredientLines, setIngredientLines] = useState<RecipeIngredientLine[]>(seedIngredientLines(initialRecipe));
  const [steps, setSteps] = useState<string[]>(parseInstructionSteps(initialRecipe?.instructions));

  const [categories, setCategories] = useState<MealCategory[]>(initialRecipe?.categories ?? []);
  const [equipment, setEquipment] = useState<CookingEquipment[]>(initialRecipe?.equipment ?? []);
  const [notes, setNotes] = useState(initialRecipe?.notes ?? '');
  const [nutritionFields, setNutritionFields] = useState<Record<string, string>>(nutritionToFields(initialRecipe?.nutrition));

  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Snapshotted once, from these exact initial state values (same generated ingredient-line ids
  // included) — comparing against a freshly-reseeded snapshot would always differ just from new
  // ids, which is why this captures the live initial state on first render instead.
  const initialSnapshotRef = useRef<string | undefined>(undefined);
  const liveSnapshot = JSON.stringify({ name, mealType, time, servings, effort, ingredientLines, steps, categories, equipment, notes, nutritionFields });
  if (initialSnapshotRef.current === undefined) {
    initialSnapshotRef.current = liveSnapshot;
  }
  const hasUnsavedChanges = liveSnapshot !== initialSnapshotRef.current;

  const validIngredientLines = ingredientLines.filter((line) => line.name.trim().length > 0);
  const { canSubmit, hasInvalidQuantity } = validateRecipeDraft({ name, mealType, time, ingredientLines });

  function setNutritionField(key: string, value: string) {
    setNutritionFields((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit() {
    if (!canSubmit) return;

    const ingredients = validIngredientLines.map((line) => line.name.trim());
    const structuredLines = validIngredientLines.filter((line) => line.quantity != null || line.unit || line.productId || line.optional || line.notes);

    // Untouched nutrition fields keep the recipe's original NutritionInfo as-is (source/completeness
    // included) — rebuilding via buildManualNutrition on every save would silently relabel an
    // 'estimated' seed value as 'user-entered' even when the user never opened this section.
    const initialNutritionFields = nutritionToFields(initialRecipe?.nutrition);
    const nutritionFieldsUnchanged = JSON.stringify(initialNutritionFields) === JSON.stringify(nutritionFields);
    const nutrition = initialRecipe?.nutrition && nutritionFieldsUnchanged ? initialRecipe.nutrition : buildManualNutrition(nutritionFields);

    onSubmit({
      name: name.trim(),
      mealType,
      categories,
      ingredients,
      ingredientLines: structuredLines.length > 0 ? structuredLines : undefined,
      instructions: steps.filter((step) => step.trim()).join('\n') || undefined,
      effort,
      time: Number(time),
      servings: parseOptionalNumber(servings),
      nutrition,
      equipment: equipment.length > 0 ? equipment : undefined,
      notes: notes.trim() || undefined,
    });
  }

  function requestCancel() {
    if (hasUnsavedChanges) {
      setConfirmDiscard(true);
      return;
    }
    onCancel();
  }

  return (
    <View style={styles.container}>
      <Card variant="standard" style={styles.section}>
        <Text style={styles.sectionTitle}>Basics</Text>
        <TextField value={name} onChangeText={setName} placeholder="Recipe name" accessibilityLabel="Recipe name" />

        <Text style={styles.label}>Meal type</Text>
        <View style={styles.chipRow}>
          {MEAL_TYPE_OPTIONS.map((option) => (
            <Chip key={option.value} label={option.label} selected={mealType.includes(option.value)} onPress={() => setMealType(toggleValue(mealType, option.value))} />
          ))}
        </View>

        <View style={styles.fieldRow}>
          <TextField value={time} onChangeText={setTime} placeholder="Time (min)" keyboardType="numeric" style={styles.half} accessibilityLabel="Preparation time in minutes" />
          <TextField value={servings} onChangeText={setServings} placeholder="Servings" keyboardType="numeric" style={styles.half} accessibilityLabel="Number of servings" />
        </View>

        <Text style={styles.label}>Effort</Text>
        <View style={styles.chipRow}>
          {EFFORT_OPTIONS.map((option) => (
            <Chip key={option.value} label={option.label} selected={effort === option.value} onPress={() => setEffort(option.value)} />
          ))}
        </View>
      </Card>

      <Card variant="standard" style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <RecipeIngredientEditor lines={ingredientLines} products={products} onChange={setIngredientLines} />
        {hasInvalidQuantity && <Text style={styles.errorText}>Quantities must be greater than zero.</Text>}
      </Card>

      <Card variant="standard" style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <RecipeInstructionEditor steps={steps} onChange={setSteps} />
      </Card>

      <Card variant="standard" style={styles.section}>
        <Text style={styles.sectionTitle}>Optional details</Text>

        <CollapsibleSection title="Dietary tags">
          <View style={styles.chipRow}>
            {MEAL_CATEGORY_OPTIONS.map((option) => (
              <Chip key={option.value} label={option.label} selected={categories.includes(option.value)} onPress={() => setCategories(toggleValue(categories, option.value))} />
            ))}
          </View>
        </CollapsibleSection>

        <CollapsibleSection title="Equipment">
          <View style={styles.chipRow}>
            {EQUIPMENT_OPTIONS.map((option) => (
              <Chip key={option.value} label={option.label} selected={equipment.includes(option.value)} onPress={() => setEquipment(toggleValue(equipment, option.value))} />
            ))}
          </View>
        </CollapsibleSection>

        {nutritionTrackingEnabled && (
          <CollapsibleSection title="Nutrition (per serving)">
            <Animated.View style={styles.nutritionForm} layout={layoutTransition(reducedMotion)}>
              <Text style={styles.hint}>Optional — leave blank whatever you don't know.</Text>
              <View style={styles.fieldRow}>
                <TextField value={nutritionFields.kcal ?? ''} onChangeText={(t) => setNutritionField('kcal', t)} placeholder="Calories (kcal)" keyboardType="numeric" style={styles.half} />
                <TextField value={nutritionFields.protein ?? ''} onChangeText={(t) => setNutritionField('protein', t)} placeholder="Protein (g)" keyboardType="numeric" style={styles.half} />
              </View>
              <View style={styles.fieldRow}>
                <TextField value={nutritionFields.carbs ?? ''} onChangeText={(t) => setNutritionField('carbs', t)} placeholder="Carbs (g)" keyboardType="numeric" style={styles.half} />
                <TextField value={nutritionFields.fat ?? ''} onChangeText={(t) => setNutritionField('fat', t)} placeholder="Fat (g)" keyboardType="numeric" style={styles.half} />
              </View>
              <View style={styles.fieldRow}>
                <TextField value={nutritionFields.fiber ?? ''} onChangeText={(t) => setNutritionField('fiber', t)} placeholder="Fiber (g)" keyboardType="numeric" style={styles.half} />
                <TextField value={nutritionFields.sugar ?? ''} onChangeText={(t) => setNutritionField('sugar', t)} placeholder="Sugar (g)" keyboardType="numeric" style={styles.half} />
              </View>
              <View style={styles.fieldRow}>
                <TextField value={nutritionFields.saturatedFat ?? ''} onChangeText={(t) => setNutritionField('saturatedFat', t)} placeholder="Saturated fat (g)" keyboardType="numeric" style={styles.half} />
                <TextField value={nutritionFields.sodium ?? ''} onChangeText={(t) => setNutritionField('sodium', t)} placeholder="Sodium (mg)" keyboardType="numeric" style={styles.half} />
              </View>
            </Animated.View>
          </CollapsibleSection>
        )}

        <CollapsibleSection title="Notes & tips">
          <TextField value={notes} onChangeText={setNotes} placeholder="Notes, tips, substitutions…" multiline style={styles.notesInput} accessibilityLabel="Recipe notes and tips" />
        </CollapsibleSection>
      </Card>

      <View style={styles.submitRow}>
        <Button label={initialRecipe ? 'Save changes' : 'Save recipe'} onPress={handleSubmit} disabled={!canSubmit} />
        <Button label="Cancel" variant="quiet" compact onPress={requestCancel} />
      </View>

      <ConfirmDialog
        visible={confirmDiscard}
        title="Discard changes?"
        message="Your edits haven't been saved. Leaving now will lose them."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setConfirmDiscard(false);
          onCancel();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.role.sectionHeading,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
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
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  half: {
    flex: 1,
  },
  errorText: {
    ...typography.role.metadata,
    color: colors.danger,
  },
  nutritionForm: {
    gap: spacing.sm,
  },
  hint: {
    color: colors.textTertiary,
    fontSize: typography.size.xs,
  },
  notesInput: {
    height: 80,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  submitRow: {
    gap: spacing.xs,
  },
});
