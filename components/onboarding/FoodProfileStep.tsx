import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { ALLERGEN_OPTIONS, INTOLERANCE_OPTIONS } from '@/constants/toleranceOptions';
import { DIET_OPTIONS } from '@/constants/dietOptions';
import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';
import { useDiet } from '@/hooks/useDiet';
import { useProductPreferences } from '@/hooks/useProductPreferences';
import { useProducts } from '@/hooks/useProducts';
import { useTolerance } from '@/hooks/useTolerance';

/**
 * Onboarding Step 3 — entirely optional. Reuses the exact same tolerance/diet/
 * product-preference hooks and storage as the standalone Tolerance & Diet
 * settings screens, so anything set here is immediately visible (and
 * editable) there too — no separate onboarding-only copy of this data.
 */
export function FoodProfileStep() {
  const tolerance = useTolerance();
  const diet = useDiet();
  const { products, isLoading: productsLoading } = useProducts();
  const productPreferences = useProductPreferences(products, productsLoading);
  const [dislikeQuery, setDislikeQuery] = useState('');

  const dislikedProducts = products.filter((product) => productPreferences.getIngredientTier(product.id) === 'dislike');
  const suggestions =
    dislikeQuery.trim().length >= 2
      ? products.filter((product) => product.name.toLowerCase().includes(dislikeQuery.trim().toLowerCase()) && productPreferences.getIngredientTier(product.id) !== 'dislike').slice(0, 5)
      : [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Anything we should know?</Text>
      <Text style={styles.subtitle}>Completely optional — skip this and add it anytime from Settings.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diet</Text>
        <View style={styles.chipRow}>
          {DIET_OPTIONS.map((option) => (
            <Chip key={option.value} label={option.label} selected={diet.profile.active.includes(option.value)} onPress={() => diet.toggleDiet(option.value)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Allergies</Text>
        <Text style={styles.sectionHint}>This affects recommendations and flags recipes automatically — it's a safety setting, not a preference.</Text>
        <View style={styles.chipRow}>
          {ALLERGEN_OPTIONS.map((option) => (
            <Chip key={option.value} label={option.label} selected={tolerance.profile.allergies.includes(option.value)} onPress={() => tolerance.toggleAllergen(option.value)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Intolerances</Text>
        <View style={styles.chipRow}>
          {INTOLERANCE_OPTIONS.map((option) => (
            <Chip key={option.value} label={option.label} selected={tolerance.profile.intolerances.includes(option.value)} onPress={() => tolerance.toggleIntolerance(option.value)} />
          ))}
        </View>
      </View>

      {(tolerance.profile.allergies.length > 0 || tolerance.profile.intolerances.length > 0) && (
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={styles.sectionTitle}>Hide my allergens</Text>
            <Text style={styles.sectionHint}>Hide recipes containing anything selected above.</Text>
          </View>
          <Switch
            value={tolerance.profile.safeMealsOnly}
            onValueChange={tolerance.setSafeMealsOnly}
            accessibilityLabel="Hide recipes containing my allergens"
            trackColor={{ false: colors.border, true: colors.accentBlueMuted }}
            thumbColor={tolerance.profile.safeMealsOnly ? colors.accentBlue : colors.textTertiary}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients you'd rather skip</Text>
        <Text style={styles.sectionHint}>Not an allergy — just nudges these lower in suggestions, never hides them entirely.</Text>
        <TextField value={dislikeQuery} onChangeText={setDislikeQuery} placeholder="Search ingredients…" accessibilityLabel="Search ingredients to mark as disliked" />
        {suggestions.length > 0 && (
          <View style={styles.suggestionList}>
            {suggestions.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => {
                  productPreferences.setIngredientTier(product.id, 'dislike');
                  setDislikeQuery('');
                }}
                style={styles.suggestionRow}
                accessibilityRole="button"
                accessibilityLabel={`Mark ${product.name} as disliked`}>
                <Text style={styles.suggestionText}>{product.name}</Text>
                <Ionicons name="add-circle-outline" size={iconSize.sm} color={colors.accentBlue} />
              </Pressable>
            ))}
          </View>
        )}
        {dislikedProducts.length > 0 && (
          <View style={styles.chipRow}>
            {dislikedProducts.map((product) => (
              <Chip key={product.id} label={product.name} selected onPress={() => productPreferences.setIngredientTier(product.id, 'neutral')} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  title: {
    ...typography.role.pageTitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.role.bodySecondary,
    color: colors.textTertiary,
    marginTop: -spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.role.label,
    color: colors.textSecondary,
  },
  sectionHint: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  switchLabel: {
    flex: 1,
    gap: 2,
  },
  suggestionList: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  suggestionText: {
    ...typography.role.bodySecondary,
    color: colors.textPrimary,
  },
});
