import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { colors, iconSize, radius, spacing, typography } from '@/constants/theme';
import { useBackup } from '@/hooks/useBackup';
import { useProfile } from '@/hooks/useProfile';
import { gatherExportData } from '@/services/backup/buildExport';
import { pickImportFile } from '@/services/backup/importFile';
import { mergeImportData } from '@/services/backup/mergeImport';
import { migrateExport } from '@/services/backup/migrateImport';
import { performImport } from '@/services/backup/performImport';
import { buildImportPreview, countDomains } from '@/services/backup/previewImport';
import { buildReplacementData } from '@/services/backup/replaceImport';
import { validateImportFile } from '@/services/backup/validateImport';
import type { ImportIssue, ImportMode, ImportPreview, UFlowExportData } from '@/types/backup';
import { generateId } from '@/utils/id';

type ImportStep = 'select' | 'validating' | 'preview' | 'mode' | 'confirm' | 'importing' | 'result';

const DOMAIN_LABELS: Record<string, string> = {
  products: 'Products',
  recipes: 'Recipes',
  inventory: 'Stock items',
  manualGroceryItems: 'Grocery items',
  mealPlan: 'Planned meals',
  mealHistory: 'History entries',
  dismissals: 'Dismissals',
};

function severityColor(severity: ImportIssue['severity']): string {
  if (severity === 'blocking') return colors.danger;
  if (severity === 'warning') return colors.accentOchre;
  return colors.textTertiary;
}

function severityIcon(severity: ImportIssue['severity']): keyof typeof Ionicons.glyphMap {
  if (severity === 'blocking') return 'close-circle';
  if (severity === 'warning') return 'alert-circle';
  return 'information-circle';
}

export default function ImportScreen() {
  const router = useRouter();
  const { recordImport } = useBackup();
  const { reloadProfile } = useProfile();

  const [step, setStep] = useState<ImportStep>('select');
  const [fileName, setFileName] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importedData, setImportedData] = useState<UFlowExportData | null>(null);
  const [currentData, setCurrentData] = useState<UFlowExportData | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [profileChoice, setProfileChoice] = useState<'keepCurrent' | 'useImported'>('keepCurrent');
  const [excludeDemoData, setExcludeDemoData] = useState(false);
  const [finalData, setFinalData] = useState<UFlowExportData | null>(null);
  const [mergeNotes, setMergeNotes] = useState<ImportIssue[]>([]);
  const [confirmReplaceVisible, setConfirmReplaceVisible] = useState(false);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);

  async function handlePickFile() {
    setPickError(null);
    const result = await pickImportFile();
    if (result.status === 'cancelled') return;
    if (result.status === 'error') {
      setPickError(result.message);
      return;
    }

    setFileName(result.file.name);
    setStep('validating');

    const validation = validateImportFile(result.file.content);
    if (!validation.canProceed || !validation.data) {
      setPreview({
        exportedAt: '',
        schemaVersion: validation.schemaVersion ?? 0,
        counts: { products: 0, recipes: 0, inventory: 0, manualGroceryItems: 0, mealPlan: 0, mealHistory: 0, dismissals: 0 },
        profileIncluded: false,
        demoDataIncluded: false,
        issues: validation.issues,
        conflicts: [],
        migrationRequired: false,
      });
      setStep('preview');
      return;
    }

    const { data: migrated, issues: migrationIssues } = migrateExport(validation.data);
    const allIssues = [...validation.issues, ...migrationIssues];
    if (migrationIssues.some((issue) => issue.severity === 'blocking')) {
      setPreview({
        exportedAt: migrated.exportedAt,
        schemaVersion: migrated.schemaVersion,
        counts: { products: 0, recipes: 0, inventory: 0, manualGroceryItems: 0, mealPlan: 0, mealHistory: 0, dismissals: 0 },
        profileIncluded: false,
        demoDataIncluded: false,
        issues: allIssues,
        conflicts: [],
        migrationRequired: true,
      });
      setStep('preview');
      return;
    }

    const current = await gatherExportData();
    setCurrentData(current);
    setImportedData(migrated.data);
    setPreview(buildImportPreview(migrated, current, allIssues, validation.schemaVersion ?? migrated.schemaVersion));
    setStep('preview');
  }

  function handleContinueToConfirm() {
    if (!importedData || !currentData) return;
    if (mode === 'replace') {
      setFinalData(buildReplacementData(importedData, excludeDemoData));
      setMergeNotes([]);
    } else {
      const merged = mergeImportData(importedData, currentData, { profileChoice, excludeDemoData }, generateId);
      setFinalData(merged.data);
      setMergeNotes(merged.issues);
    }
    setStep('confirm');
  }

  function handleRequestConfirmImport() {
    if (mode === 'replace') {
      setConfirmReplaceVisible(true);
    } else {
      runImport();
    }
  }

  async function runImport() {
    setConfirmReplaceVisible(false);
    if (!finalData || !preview) return;
    setStep('importing');
    const result = await performImport(finalData);
    setImportSuccess(result.success);
    setImportErrorMessage(result.error?.message ?? null);
    if (result.success) {
      const warningsCount = preview.issues.filter((i) => i.severity === 'warning').length + mergeNotes.filter((i) => i.severity === 'warning').length;
      await recordImport(preview.schemaVersion, warningsCount);
      await reloadProfile();
    }
    setStep('result');
  }

  function handleStartOver() {
    setStep('select');
    setFileName(null);
    setPickError(null);
    setPreview(null);
    setImportedData(null);
    setCurrentData(null);
    setFinalData(null);
    setMergeNotes([]);
    setImportSuccess(null);
    setImportErrorMessage(null);
  }

  const blockingIssues = preview?.issues.filter((i) => i.severity === 'blocking') ?? [];
  const canProceedFromPreview = preview != null && blockingIssues.length === 0;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Import Data' }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {step === 'select' && (
          <View style={styles.stepContainer}>
            <PageHeader title="Choose a backup file" subtitle="Only .json files exported from uFlow are supported." />
            <Button label="Choose file" onPress={handlePickFile} />
            {pickError && (
              <View style={styles.issueBanner} accessibilityLiveRegion="assertive">
                <Ionicons name="close-circle" size={iconSize.sm} color={colors.danger} />
                <Text style={styles.issueBannerText}>{pickError}</Text>
              </View>
            )}
          </View>
        )}

        {step === 'validating' && (
          <View style={styles.centeredStatus}>
            <ActivityIndicator color={colors.accentBlue} />
            <Text style={styles.statusText}>Reading {fileName}…</Text>
          </View>
        )}

        {step === 'preview' && preview && (
          <View style={styles.stepContainer}>
            <PageHeader title="Review this backup" subtitle={fileName ?? undefined} />

            {!canProceedFromPreview ? (
              <Card variant="standard" style={styles.card}>
                <Text style={styles.cardTitle}>This file can't be imported</Text>
                {blockingIssues.map((issue, index) => (
                  <View key={index} style={styles.issueRow}>
                    <Ionicons name={severityIcon(issue.severity)} size={iconSize.sm} color={severityColor(issue.severity)} />
                    <Text style={styles.issueText}>{issue.message}</Text>
                  </View>
                ))}
              </Card>
            ) : (
              <>
                <Card variant="standard" style={styles.card}>
                  <Text style={styles.cardTitle}>What's in this backup</Text>
                  {preview.exportedAt && <Text style={styles.metaText}>Exported {new Date(preview.exportedAt).toLocaleString()}</Text>}
                  <Text style={styles.metaText}>Schema v{preview.schemaVersion}{preview.appVersion ? ` · uFlow ${preview.appVersion}` : ''}</Text>
                  <View style={styles.countGrid}>
                    {(Object.keys(DOMAIN_LABELS) as (keyof typeof DOMAIN_LABELS)[]).map((key) => (
                      <View key={key} style={styles.countCell}>
                        <Text style={styles.countValue}>{preview.counts[key as keyof typeof preview.counts]}</Text>
                        <Text style={styles.countLabel}>{DOMAIN_LABELS[key]}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.metaText}>{preview.profileIncluded ? 'Includes a profile.' : 'No profile included.'}</Text>
                  {preview.demoDataIncluded && <Text style={styles.metaText}>Includes demo data.</Text>}
                  {preview.migrationRequired && <Text style={styles.metaText}>This backup was migrated to the current format.</Text>}
                </Card>

                {preview.conflicts.length > 0 && (
                  <Card variant="standard" style={styles.card}>
                    <Text style={styles.cardTitle}>Conflicts with your current data</Text>
                    {preview.conflicts.map((conflict, index) => (
                      <View key={index} style={styles.issueRow}>
                        <Ionicons name="git-merge-outline" size={iconSize.sm} color={colors.accentOchre} />
                        <Text style={styles.issueText}>{conflict.description}</Text>
                      </View>
                    ))}
                  </Card>
                )}

                {preview.issues.filter((i) => i.severity !== 'blocking').length > 0 && (
                  <Card variant="standard" style={styles.card}>
                    <Text style={styles.cardTitle}>Notes</Text>
                    {preview.issues
                      .filter((i) => i.severity !== 'blocking')
                      .map((issue, index) => (
                        <View key={index} style={styles.issueRow}>
                          <Ionicons name={severityIcon(issue.severity)} size={iconSize.sm} color={severityColor(issue.severity)} />
                          <Text style={styles.issueText}>{issue.message}</Text>
                        </View>
                      ))}
                  </Card>
                )}
              </>
            )}

            <View style={styles.actionRow}>
              {canProceedFromPreview && <Button label="Continue" onPress={() => setStep('mode')} />}
              <Button label="Choose a different file" variant="quiet" onPress={handleStartOver} />
            </View>
          </View>
        )}

        {step === 'mode' && (
          <View style={styles.stepContainer}>
            <PageHeader title="How should this be imported?" />

            <Pressable
              onPress={() => setMode('merge')}
              accessibilityRole="radio"
              accessibilityState={{ selected: mode === 'merge' }}
              accessibilityLabel="Merge safely"
              style={[styles.modeCard, mode === 'merge' && styles.modeCardSelected]}>
              <Text style={styles.cardTitle}>Merge safely</Text>
              <Text style={styles.metaText}>Adds what's new from this backup. Your current data is kept — nothing is silently overwritten.</Text>
            </Pressable>

            <Pressable
              onPress={() => setMode('replace')}
              accessibilityRole="radio"
              accessibilityState={{ selected: mode === 'replace' }}
              accessibilityLabel="Replace existing data"
              style={[styles.modeCard, mode === 'replace' && styles.modeCardSelected]}>
              <Text style={[styles.cardTitle, styles.destructiveText]}>Replace existing data</Text>
              <Text style={styles.metaText}>Clears your current data and writes this backup exactly as it is. This can't be undone.</Text>
            </Pressable>

            {mode === 'merge' && (
              <Card variant="standard" style={styles.card}>
                <Text style={styles.cardTitle}>Profile & settings</Text>
                <Text style={styles.metaText}>Which profile and module settings (Budget, Nutrition, Context Intelligence, diet, tolerances) should be kept?</Text>
                <View style={styles.choiceRow}>
                  <Pressable
                    onPress={() => setProfileChoice('keepCurrent')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: profileChoice === 'keepCurrent' }}
                    style={[styles.choicePill, profileChoice === 'keepCurrent' && styles.choicePillSelected]}>
                    <Text style={styles.choicePillText}>Keep current</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setProfileChoice('useImported')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: profileChoice === 'useImported' }}
                    style={[styles.choicePill, profileChoice === 'useImported' && styles.choicePillSelected]}>
                    <Text style={styles.choicePillText}>Use imported</Text>
                  </Pressable>
                </View>
              </Card>
            )}

            {preview?.demoDataIncluded && (
              <Card variant="standard" style={styles.card}>
                <View style={styles.switchRow}>
                  <View style={styles.rowText}>
                    <Text style={styles.cardTitle}>Exclude demo data</Text>
                    <Text style={styles.metaText}>Leaves out any demo-tagged items from this backup.</Text>
                  </View>
                  <Switch
                    value={excludeDemoData}
                    onValueChange={setExcludeDemoData}
                    accessibilityLabel={`Exclude demo data, ${excludeDemoData ? 'enabled' : 'disabled'}`}
                    trackColor={{ false: colors.border, true: colors.accentBlueMuted }}
                    thumbColor={excludeDemoData ? colors.accentBlue : colors.textTertiary}
                  />
                </View>
              </Card>
            )}

            <View style={styles.actionRow}>
              <Button label="Continue" onPress={handleContinueToConfirm} />
              <Button label="Back" variant="quiet" onPress={() => setStep('preview')} />
            </View>
          </View>
        )}

        {step === 'confirm' && finalData && (
          <View style={styles.stepContainer}>
            <PageHeader title="Confirm import" />
            <Card variant="standard" style={styles.card}>
              <Text style={styles.cardTitle}>{mode === 'replace' ? 'This will replace your current data' : 'This will merge into your current data'}</Text>
              <View style={styles.countGrid}>
                {(Object.keys(DOMAIN_LABELS) as (keyof typeof DOMAIN_LABELS)[]).map((key) => (
                  <View key={key} style={styles.countCell}>
                    <Text style={styles.countValue}>{countDomains(finalData)[key as keyof ReturnType<typeof countDomains>]}</Text>
                    <Text style={styles.countLabel}>{DOMAIN_LABELS[key]} after import</Text>
                  </View>
                ))}
              </View>
              {mergeNotes.length > 0 && (
                <View style={styles.notesList}>
                  {mergeNotes.map((note, index) => (
                    <View key={index} style={styles.issueRow}>
                      <Ionicons name={severityIcon(note.severity)} size={iconSize.sm} color={severityColor(note.severity)} />
                      <Text style={styles.issueText}>{note.message}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
            <View style={styles.actionRow}>
              <Button label={mode === 'replace' ? 'Replace data' : 'Import'} variant={mode === 'replace' ? 'destructive' : 'primary'} onPress={handleRequestConfirmImport} />
              <Button label="Back" variant="quiet" onPress={() => setStep('mode')} />
            </View>
          </View>
        )}

        {step === 'importing' && (
          <View style={styles.centeredStatus}>
            <ActivityIndicator color={colors.accentBlue} />
            <Text style={styles.statusText}>Importing…</Text>
          </View>
        )}

        {step === 'result' && (
          <View style={styles.stepContainer}>
            <View style={styles.resultIconCircle}>
              <Ionicons name={importSuccess ? 'checkmark' : 'close'} size={iconSize.xl} color={importSuccess ? colors.accentGreen : colors.danger} />
            </View>
            <Text style={styles.resultTitle} accessibilityLiveRegion="assertive">
              {importSuccess ? 'Import complete.' : 'Import failed.'}
            </Text>
            {!importSuccess && importErrorMessage && <Text style={styles.metaText}>{importErrorMessage}</Text>}
            <View style={styles.actionRow}>
              {importSuccess ? (
                <Button label="Go to Today" onPress={() => router.replace('/')} />
              ) : (
                <>
                  <Button label="Try again" onPress={handleStartOver} />
                  <Button label="Back to Settings" variant="quiet" onPress={() => router.back()} />
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={confirmReplaceVisible}
        title="Replace all current data?"
        message="This clears your current recipes, stock, grocery list, plan, and history, and writes this backup exactly as it is. This can't be undone."
        confirmLabel="Replace data"
        destructive
        onConfirm={runImport}
        onCancel={() => setConfirmReplaceVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  stepContainer: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.role.cardTitle,
    color: colors.textPrimary,
  },
  destructiveText: {
    color: colors.danger,
  },
  metaText: {
    ...typography.role.bodySecondary,
    color: colors.textSecondary,
  },
  issueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  issueBannerText: {
    ...typography.role.bodySecondary,
    color: colors.danger,
    flex: 1,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  issueText: {
    ...typography.role.bodySecondary,
    color: colors.textSecondary,
    flex: 1,
  },
  notesList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  countGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  countCell: {
    minWidth: 100,
    gap: 2,
  },
  countValue: {
    ...typography.role.numericHighlight,
    color: colors.textPrimary,
  },
  countLabel: {
    ...typography.role.metadata,
    color: colors.textTertiary,
  },
  actionRow: {
    gap: spacing.xs,
  },
  centeredStatus: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xxl * 2,
  },
  statusText: {
    ...typography.role.body,
    color: colors.textSecondary,
  },
  modeCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeCardSelected: {
    borderColor: colors.accentBlue,
    backgroundColor: colors.surfaceElevated,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  choicePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
  },
  choicePillSelected: {
    backgroundColor: colors.accentBlueMuted,
  },
  choicePillText: {
    ...typography.role.label,
    color: colors.textPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  resultIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  resultTitle: {
    ...typography.role.pageTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
