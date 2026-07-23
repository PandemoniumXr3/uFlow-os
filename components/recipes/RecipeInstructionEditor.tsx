import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';

type RecipeInstructionEditorProps = {
  /** One step per entry — the caller joins these with '\n' into Recipe.instructions on save. */
  steps: string[];
  onChange: (steps: string[]) => void;
};

/** Ordered step editor — add/reorder/remove — operating on a plain string array; storage stays a single newline-joined string. */
export function RecipeInstructionEditor({ steps, onChange }: RecipeInstructionEditorProps) {
  function updateStep(index: number, text: string) {
    onChange(steps.map((step, i) => (i === index ? text : step)));
  }

  function removeStep(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    const next = [...steps];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  }

  function addStep() {
    onChange([...steps, '']);
  }

  return (
    <View style={styles.container}>
      {steps.map((step, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.reorderColumn}>
            <Pressable
              onPress={() => moveStep(index, -1)}
              disabled={index === 0}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Move step ${index + 1} up`}>
              <Ionicons name="chevron-up" size={iconSize.sm} color={index === 0 ? colors.textTertiary : colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => moveStep(index, 1)}
              disabled={index === steps.length - 1}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Move step ${index + 1} down`}>
              <Ionicons name="chevron-down" size={iconSize.sm} color={index === steps.length - 1 ? colors.textTertiary : colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.stepNumber}>{index + 1}</Text>
          <TextField
            value={step}
            onChangeText={(text) => updateStep(index, text)}
            placeholder={`Step ${index + 1}`}
            multiline
            style={styles.stepInput}
            accessibilityLabel={`Step ${index + 1}`}
          />
          <IconButton icon="close-circle-outline" variant="danger" accessibilityLabel={`Remove step ${index + 1}`} onPress={() => removeStep(index)} />
        </View>
      ))}

      <Pressable onPress={addStep} style={styles.addRow} accessibilityRole="button" accessibilityLabel="Add step">
        <Ionicons name="add-circle-outline" size={iconSize.md} color={colors.accentBlue} />
        <Text style={styles.addLabel}>Add step</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  reorderColumn: {
    paddingTop: spacing.xs,
  },
  stepNumber: {
    ...typography.role.body,
    fontWeight: typography.weight.semibold,
    color: colors.accentBlue,
    paddingTop: spacing.xs,
    minWidth: 16,
  },
  stepInput: {
    flex: 1,
    minHeight: 44,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
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
