import { EXPORT_SCHEMA_VERSION, type ImportIssue, type UFlowExport } from '@/types/backup';

/**
 * One migration per schema version bump — takes the previous version's
 * shape and returns the current one. Registered in order; `migrateExport`
 * runs every migration between the file's version and current
 * sequentially (v1 → v2 → v3 → …), never jumping straight to the latest
 * shape. Empty today because only schema v1 has ever shipped — the next
 * migration added here is the first real test of this structure holding up.
 */
const MIGRATIONS: Array<(data: UFlowExport) => UFlowExport> = [
  // v1 -> v2 would go here, keyed by array index = fromVersion - 1.
];

export interface MigrationResult {
  data: UFlowExport;
  issues: ImportIssue[];
}

/**
 * Assumes `validateImportFile` already confirmed `schemaVersion` is within
 * `[MIN_SUPPORTED_SCHEMA_VERSION, EXPORT_SCHEMA_VERSION]` — this never
 * re-checks that boundary, it only walks the migration chain up to current.
 */
export function migrateExport(input: UFlowExport): MigrationResult {
  const issues: ImportIssue[] = [];
  let current = input;

  for (let version = input.schemaVersion; version < EXPORT_SCHEMA_VERSION; version++) {
    const migrate = MIGRATIONS[version - 1];
    if (!migrate) {
      issues.push({
        severity: 'blocking',
        domain: 'schema',
        code: 'failed_migration',
        message: `No migration is registered from schema v${version} to v${version + 1}.`,
      });
      return { data: current, issues };
    }
    current = migrate(current);
  }

  return { data: { ...current, schemaVersion: EXPORT_SCHEMA_VERSION }, issues };
}
