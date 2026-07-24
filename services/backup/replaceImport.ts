import { excludeDemoDataFromExport } from '@/services/backup/buildExport';
import type { UFlowExportData } from '@/types/backup';

/**
 * Pure — "replace" has no ambiguity to resolve (that's what distinguishes
 * it from merge): the imported data becomes the new data, full stop. The
 * one exception is a possibly-absent or old-schema `profile` — but that
 * needs no special handling here, because the exact same
 * `resolveOnboardingForProfile` migration that already runs on every app
 * load will correctly recognize a profile with real data and no
 * `onboarding` field as an existing user on the very next load, the same
 * way it does for a real device upgrade.
 */
export function buildReplacementData(imported: UFlowExportData, excludeDemoData: boolean): UFlowExportData {
  return excludeDemoData ? excludeDemoDataFromExport(imported) : imported;
}
