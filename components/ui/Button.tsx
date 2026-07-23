import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, iconSize, radius, shadow, spacing, typography } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Renders at list-row scale instead of full width — for a compact action inside a card. */
  compact?: boolean;
};

/**
 * Four intentional variants, so a screen never ends up with three
 * equally-loud buttons in a row: primary (the one obvious action), secondary
 * (a real alternative, still solid but quieter), quiet (a text-only action
 * like "Not this"), destructive (remove/delete/clear).
 */
export function Button({ label, onPress, variant = 'primary', disabled, loading, compact }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        VARIANT_CONTAINER[variant],
        variant === 'primary' && !isDisabled && shadow.glow,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.background : colors.textPrimary} />
      ) : (
        <Text style={[styles.label, VARIANT_LABEL[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'default' | 'danger' | 'favorite' | 'safe';
  accessibilityLabel: string;
};

const iconButtonColor: Record<NonNullable<IconButtonProps['variant']>, string> = {
  default: colors.textSecondary,
  danger: colors.danger,
  favorite: colors.accentCyan,
  safe: colors.accentGreen,
};

export function IconButton({ icon, onPress, variant = 'default', accessibilityLabel }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={iconSize.md} color={iconButtonColor[variant]} />
    </Pressable>
  );
}

const VARIANT_CONTAINER: Record<ButtonVariant, object> = {
  primary: { backgroundColor: colors.accentBlue },
  secondary: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  quiet: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: colors.dangerMuted, borderWidth: 1, borderColor: colors.danger },
};

const VARIANT_LABEL: Record<ButtonVariant, object> = {
  primary: { color: colors.background },
  secondary: { color: colors.textPrimary },
  quiet: { color: colors.textSecondary, fontWeight: typography.weight.regular },
  destructive: { color: colors.danger },
};

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  compact: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
