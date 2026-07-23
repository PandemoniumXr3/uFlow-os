import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';

type RecipeDeleteDialogProps = {
  visible: boolean;
  recipeName: string;
  plannedMealCount: number;
  historyCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Explains real consequences before deleting — planned meals and history
 * entries aren't cascade-deleted (they keep their recipeId and fall back to
 * "Recipe removed" wherever they're shown), but the user should know that
 * up front rather than discover it later. Deleting always offers Undo
 * immediately after (handled by the caller, which holds the exact snapshot).
 */
export function RecipeDeleteDialog({ visible, recipeName, plannedMealCount, historyCount, onConfirm, onCancel }: RecipeDeleteDialogProps) {
  if (!visible) return null;

  const effects: string[] = [];
  if (plannedMealCount > 0) {
    effects.push(`${plannedMealCount} planned meal${plannedMealCount === 1 ? '' : 's'} will keep its slot but show as removed`);
  }
  if (historyCount > 0) {
    effects.push(`${historyCount} past log entr${historyCount === 1 ? 'y stays' : 'ies stay'} in your history`);
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Delete "{recipeName}"?</Text>
        <Text style={styles.message}>
          {effects.length > 0 ? effects.join('. ') + '.' : 'This recipe isn\'t planned or logged anywhere right now.'} You can undo this
          right after.
        </Text>
        <View style={styles.actions}>
          <Button label="Delete" variant="destructive" onPress={onConfirm} />
          <Button label="Cancel" variant="quiet" onPress={onCancel} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 10,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  title: {
    ...typography.role.cardTitle,
    color: colors.textPrimary,
  },
  message: {
    ...typography.role.body,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.sm,
  },
});
