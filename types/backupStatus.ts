/**
 * Lightweight metadata only — never the full imported/exported file. This is
 * just enough for Settings to show "last export: 2 hours ago" / "last
 * import: schema v1, 2 warnings" without retaining a hidden second copy of
 * the user's data.
 */
export interface BackupStatus {
  lastExportAt?: string;
  lastImportAt?: string;
  lastImportSchemaVersion?: number;
  lastImportWarningsCount?: number;
}
