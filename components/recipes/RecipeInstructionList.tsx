import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { EQUIPMENT_OPTIONS } from '@/constants/mealOptions';
import { colors, iconSize, spacing, typography } from '@/constants/theme';
import type { CookingEquipment } from '@/types/recipe';

type RecipeInstructionListProps = {
  /** Free text, one step per line — the storage format stays a single string; this is the only place that splits it. */
  instructions?: string;
  equipment?: CookingEquipment[];
  notes?: string;
  time: number;
};

/** Splits `instructions` into ordered steps by line — never invents steps for a recipe that only has a paragraph or nothing at all. */
export function parseInstructionSteps(instructions?: string): string[] {
  return (instructions ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function RecipeInstructionList({ instructions, equipment, notes, time }: RecipeInstructionListProps) {
  const steps = parseInstructionSteps(instructions);

  return (
    <View style={styles.container}>
      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={iconSize.sm} color={colors.textSecondary} />
        <Text style={styles.timeText}>{time} min</Text>
      </View>

      {equipment && equipment.length > 0 && (
        <View style={styles.equipmentRow}>
          {equipment.map((item) => {
            const option = EQUIPMENT_OPTIONS.find((candidate) => candidate.value === item);
            return (
              <View key={item} style={styles.equipmentChip}>
                <Ionicons name={(option?.icon ?? 'construct-outline') as keyof typeof Ionicons.glyphMap} size={iconSize.sm} color={colors.textSecondary} />
                <Text style={styles.equipmentLabel}>{option?.label ?? item}</Text>
              </View>
            );
          })}
        </View>
      )}

      {steps.length > 0 ? (
        <View style={styles.stepList}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>No instructions added yet.</Text>
      )}

      {notes && (
        <View style={styles.notesBlock}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{notes}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    ...typography.role.bodySecondary,
    color: colors.textSecondary,
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  equipmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  equipmentLabel: {
    ...typography.role.metadata,
    color: colors.textSecondary,
  },
  stepList: {
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepNumber: {
    ...typography.role.body,
    fontWeight: typography.weight.semibold,
    color: colors.accentBlue,
    minWidth: 20,
  },
  stepText: {
    ...typography.role.body,
    color: colors.textPrimary,
    flex: 1,
  },
  emptyText: {
    ...typography.role.bodySecondary,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  notesBlock: {
    gap: 2,
  },
  notesLabel: {
    ...typography.role.label,
    color: colors.textSecondary,
  },
  notesText: {
    ...typography.role.bodySecondary,
    color: colors.textSecondary,
  },
});
