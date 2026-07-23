import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

/** The "clear demo label" — a one-line, always-visible reminder, not a badge buried in each list item. */
export function DemoDataBanner() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Showing demo data</Text>
      <Pressable onPress={() => router.push('/settings')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Manage demo data in Settings">
        <Text style={styles.link}>Manage</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accentOchreMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.role.metadata,
    color: colors.textAccentSand,
    fontWeight: typography.weight.medium,
  },
  link: {
    ...typography.role.metadata,
    color: colors.textAccentSand,
    textDecorationLine: 'underline',
  },
});
