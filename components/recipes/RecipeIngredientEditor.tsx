import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';
import type { Product } from '@/types/product';
import type { RecipeIngredientLine } from '@/types/recipe';
import { findDuplicateIngredientNames } from '@/utils/findDuplicateIngredientLines';
import { generateId } from '@/utils/id';

type RecipeIngredientEditorProps = {
  lines: RecipeIngredientLine[];
  products: Product[];
  onChange: (lines: RecipeIngredientLine[]) => void;
};

function newLine(): RecipeIngredientLine {
  return { id: generateId(), name: '' };
}

/**
 * The one ingredient-builder row group, shared by Add and Edit Recipe.
 * Every line gets a stable `id` (assigned here if absent, e.g. a legacy
 * line being edited for the first time) so reorder/remove/duplicate
 * detection never rely on array index. Linking a Product only ever fills
 * in the name if it's still blank — an already-typed quantity or a
 * different free-text name is never silently overwritten.
 */
export function RecipeIngredientEditor({ lines, products, onChange }: RecipeIngredientEditorProps) {
  const [searchOpenId, setSearchOpenId] = useState<string | null>(null);
  const duplicates = findDuplicateIngredientNames(lines);

  function updateLine(id: string, patch: Partial<RecipeIngredientLine>) {
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function removeLine(id: string) {
    onChange(lines.filter((line) => line.id !== id));
  }

  function moveLine(id: string, direction: -1 | 1) {
    const index = lines.findIndex((line) => line.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= lines.length) return;
    const next = [...lines];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  }

  function addLine() {
    onChange([...lines, newLine()]);
  }

  function linkProduct(id: string, product: Product) {
    const line = lines.find((candidate) => candidate.id === id);
    updateLine(id, { productId: product.id, name: line?.name.trim() ? line.name : product.name });
    setSearchOpenId(null);
  }

  return (
    <View style={styles.container}>
      {lines.map((line, index) => {
        const isDuplicate = duplicates.has(line.name.trim().toLowerCase());
        const linkedProduct = line.productId ? products.find((product) => product.id === line.productId) : undefined;
        const suggestions =
          searchOpenId === line.id && !line.productId && line.name.trim().length >= 2
            ? products.filter((product) => product.name.toLowerCase().includes(line.name.trim().toLowerCase())).slice(0, 5)
            : [];

        return (
          <View key={line.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowIndex}>{index + 1}</Text>
              <View style={styles.reorderColumn}>
                <Pressable
                  onPress={() => moveLine(line.id!, -1)}
                  disabled={index === 0}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${line.name || 'ingredient'} up`}>
                  <Ionicons name="chevron-up" size={iconSize.sm} color={index === 0 ? colors.textTertiary : colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => moveLine(line.id!, 1)}
                  disabled={index === lines.length - 1}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${line.name || 'ingredient'} down`}>
                  <Ionicons name="chevron-down" size={iconSize.sm} color={index === lines.length - 1 ? colors.textTertiary : colors.textSecondary} />
                </Pressable>
              </View>

              <TextField
                value={line.name}
                onChangeText={(text) => {
                  updateLine(line.id!, { name: text });
                  setSearchOpenId(line.id!);
                }}
                placeholder="Ingredient name"
                style={styles.nameInput}
                accessibilityLabel={`Ingredient ${index + 1} name`}
              />

              <IconButton icon="close-circle-outline" variant="danger" accessibilityLabel={`Remove ${line.name || 'this ingredient'}`} onPress={() => removeLine(line.id!)} />
            </View>

            {linkedProduct ? (
              <View style={styles.linkedRow}>
                <Ionicons name="link" size={iconSize.sm} color={colors.accentBlue} />
                <Text style={styles.linkedText}>Linked to {linkedProduct.name}</Text>
                <Pressable onPress={() => updateLine(line.id!, { productId: undefined })} hitSlop={8}>
                  <Text style={styles.unlinkText}>Unlink</Text>
                </Pressable>
              </View>
            ) : (
              suggestions.length > 0 && (
                <View style={styles.suggestionList}>
                  {suggestions.map((product) => (
                    <Pressable
                      key={product.id}
                      onPress={() => linkProduct(line.id!, product)}
                      style={styles.suggestionRow}
                      accessibilityRole="button"
                      accessibilityLabel={`Link to product ${product.name}`}>
                      <Text style={styles.suggestionText}>{product.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )
            )}

            <View style={styles.fieldRow}>
              <TextField
                value={line.quantity != null ? String(line.quantity) : ''}
                onChangeText={(text) => {
                  const parsed = Number(text.trim());
                  updateLine(line.id!, { quantity: text.trim() === '' ? undefined : Number.isNaN(parsed) ? line.quantity : parsed });
                }}
                placeholder="Qty"
                keyboardType="numeric"
                style={styles.qtyInput}
                accessibilityLabel={`Ingredient ${index + 1} quantity`}
              />
              <TextField
                value={line.unit ?? ''}
                onChangeText={(text) => updateLine(line.id!, { unit: text || undefined })}
                placeholder="Unit (g, ml, piece…)"
                style={styles.unitInput}
                accessibilityLabel={`Ingredient ${index + 1} unit`}
              />
            </View>

            <View style={styles.fieldRow}>
              <Chip label="Optional" selected={!!line.optional} onPress={() => updateLine(line.id!, { optional: !line.optional })} />
              <TextField
                value={line.notes ?? ''}
                onChangeText={(text) => updateLine(line.id!, { notes: text || undefined })}
                placeholder="Notes (optional)"
                style={styles.notesInput}
                accessibilityLabel={`Ingredient ${index + 1} notes`}
              />
            </View>

            {isDuplicate && line.name.trim() && (
              <View style={styles.duplicateWarning}>
                <Ionicons name="alert-circle-outline" size={iconSize.sm} color={colors.accentOchre} />
                <Text style={styles.duplicateText}>This ingredient appears more than once</Text>
              </View>
            )}
          </View>
        );
      })}

      <Pressable onPress={addLine} style={styles.addRow} accessibilityRole="button" accessibilityLabel="Add ingredient">
        <Ionicons name="add-circle-outline" size={iconSize.md} color={colors.accentBlue} />
        <Text style={styles.addLabel}>Add ingredient</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowIndex: {
    ...typography.role.metadata,
    color: colors.textTertiary,
    minWidth: 14,
  },
  reorderColumn: {
    gap: 0,
  },
  nameInput: {
    flex: 1,
  },
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkedText: {
    ...typography.role.metadata,
    color: colors.accentBlue,
    flex: 1,
  },
  unlinkText: {
    ...typography.role.metadata,
    color: colors.textTertiary,
    textDecorationLine: 'underline',
  },
  suggestionList: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  suggestionText: {
    ...typography.role.bodySecondary,
    color: colors.textPrimary,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  qtyInput: {
    flex: 1,
  },
  unitInput: {
    flex: 1,
  },
  notesInput: {
    flex: 1,
  },
  duplicateWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  duplicateText: {
    ...typography.role.metadata,
    color: colors.accentOchre,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  addLabel: {
    ...typography.role.body,
    color: colors.accentBlue,
    fontWeight: typography.weight.medium,
  },
});
