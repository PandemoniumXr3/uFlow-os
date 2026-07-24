import { usePathname } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { getFeedbackContext, sendFeedback } from '@/services/feedback/feedbackMail';

interface AppErrorBoundaryProps {
  error: Error;
  retry: () => Promise<void>;
}

/**
 * Replaces expo-router's default ErrorBoundary, which renders `Error: ${error.message}` directly
 * on screen unconditionally — a real message leak in a production build. This version only shows
 * that detail under `__DEV__`; production users only ever see "Something went wrong".
 *
 * Deliberately has no dependency on ProfileContext/UndoContext: this can render in place of the
 * entire app tree (including those providers) if the crash happened inside one of them, so it must
 * stand on its own.
 */
export function AppErrorBoundary({ error, retry }: AppErrorBoundaryProps) {
  const pathname = usePathname();
  const [reportState, setReportState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  async function handleReportProblem() {
    setReportState('sending');
    const context = getFeedbackContext(pathname);
    const result = await sendFeedback('bug', context, error.message);
    setReportState(result.success ? 'sent' : 'failed');
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          Something went wrong
        </Text>
        <Text style={styles.message}>uFlow ran into a problem. Your data is safe on this device — try again, or let us know what happened.</Text>

        {__DEV__ && (
          <View style={styles.devBox}>
            <Text style={styles.devLabel}>Development details (hidden in production builds)</Text>
            <Text style={styles.devMessage} selectable>
              {error.message}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Button label="Try again" variant="primary" onPress={() => void retry()} />
          <Button
            label={reportState === 'sending' ? 'Opening…' : reportState === 'sent' ? 'Report ready to send' : 'Report problem'}
            variant="secondary"
            onPress={handleReportProblem}
            disabled={reportState === 'sending'}
          />
        </View>

        {reportState === 'failed' && <Text style={styles.note}>Couldn't open mail or copy the report. Please check Settings for a support contact.</Text>}
        {reportState === 'sent' && <Text style={styles.note}>A pre-filled report was opened in your mail app (or copied, if no mail app is set up) — review it, then send.</Text>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  message: {
    fontSize: typography.size.base,
    color: colors.textSecondary,
  },
  devBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    gap: spacing.xs,
  },
  devLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.danger,
  },
  devMessage: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontFamily: 'SpaceMono',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  note: {
    fontSize: typography.size.sm,
    color: colors.textTertiary,
  },
});
