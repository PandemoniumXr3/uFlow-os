import { TextInput, type TextInputProps } from 'react-native';
import { StyleSheet } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

export function TextField({ style, ...props }: TextInputProps) {
  return <TextInput placeholderTextColor={colors.textTertiary} style={[styles.input, style]} {...props} />;
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.size.base,
  },
});
