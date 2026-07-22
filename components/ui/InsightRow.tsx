import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, iconSize, spacing, typography } from '@/constants/theme';

type InsightRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  tone?: 'neutral' | 'warm' | 'good';
};

const TONE_COLOR: Record<NonNullable<InsightRowProps['tone']>, string> = {
  neutral: colors.textSecondary,
  warm: colors.accentOchre,
  good: colors.accentGreen,
};

/** One line inside an insight panel — icon + text, no border, no pill. Stack a few inside one Card(insight) rather than one card per fact. */
export function InsightRow({ icon, text, tone = 'neutral' }: InsightRowProps) {
  const color = TONE_COLOR[tone];
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={iconSize.sm} color={color} />
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    ...typography.role.bodySecondary,
    flex: 1,
  },
});
