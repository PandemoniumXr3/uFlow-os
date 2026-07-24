import type { DemoDataMetadata } from '@/types/demoData';
import type { DietProfile } from '@/types/diet';
import type { DismissalEntry } from '@/types/dismissal';
import type { InventoryItem } from '@/types/inventory';
import type { MealLogEntry } from '@/types/mealLog';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { ProductPreferences } from '@/types/productPreferences';
import type { UserProfile } from '@/types/profile';
import type { Recipe } from '@/types/recipe';
import type { SafeMealsProfile } from '@/types/safeMeals';
import type { AutomaticItemOverlay, ShoppingItem } from '@/types/shoppingItem';
import type { ToleranceProfile } from '@/types/tolerance';

/** Bumped only when the export shape itself changes enough that older files need migrating. */
export const EXPORT_SCHEMA_VERSION = 1;
/** The oldest schemaVersion this build can still read (via sequential migration). Anything below this is rejected outright. */
export const MIN_SUPPORTED_SCHEMA_VERSION = 1;

/**
 * Every domain this app persists, gathered in one place. Deliberately
 * excludes `budgetSettings`/`nutritionSettings` as separate fields — both
 * already live on `UserProfile` (`budget`, `nutritionTrackingEnabled`,
 * `hiddenNutrients`) and are covered by `profile`, so a duplicate top-level
 * field would just be two sources of truth for the same data. Also
 * excludes `notificationPreferences`/`challenges`/`rewards` — none of
 * those features exist yet, and a placeholder field nothing produces or
 * consumes is exactly the kind of foundation-less flag this codebase's own
 * conventions warn against (see UserProfile's docblock).
 */
export interface UFlowExportData {
  profile: UserProfile | null;
  products: Product[];
  recipes: Recipe[];
  inventory: InventoryItem[];
  manualGroceryItems: ShoppingItem[];
  groceryOverlay: AutomaticItemOverlay;
  mealPlan: PlannedMeal[];
  mealHistory: MealLogEntry[];
  dismissals: DismissalEntry[];
  safeMeals: SafeMealsProfile | null;
  diet: DietProfile | null;
  tolerances: ToleranceProfile | null;
  productPreferences: ProductPreferences | null;
  demoMetadata: DemoDataMetadata | null;
}

export interface UFlowExport {
  schemaVersion: number;
  exportedAt: string;
  appVersion?: string;
  platform?: string;
  data: UFlowExportData;
}

export type ImportDomain =
  | 'file'
  | 'schema'
  | 'profile'
  | 'products'
  | 'recipes'
  | 'inventory'
  | 'manualGroceryItems'
  | 'groceryOverlay'
  | 'mealPlan'
  | 'mealHistory'
  | 'dismissals'
  | 'safeMeals'
  | 'diet'
  | 'tolerances'
  | 'productPreferences'
  | 'demoMetadata';

export type ImportIssueSeverity = 'info' | 'warning' | 'blocking';

export interface ImportIssue {
  severity: ImportIssueSeverity;
  domain: ImportDomain;
  /** Short, stable, machine-checkable code (e.g. 'invalid_json') — tests assert on this, not on `message` wording. */
  code: string;
  message: string;
  entityId?: string;
}

export interface ImportValidationResult {
  issues: ImportIssue[];
  /** True only when no `blocking` issue is present. */
  canProceed: boolean;
  schemaVersion?: number;
  /** Present only once JSON.parse + top-level shape checks succeed. */
  data?: UFlowExport;
}

export interface ImportDomainCounts {
  products: number;
  recipes: number;
  inventory: number;
  manualGroceryItems: number;
  mealPlan: number;
  mealHistory: number;
  dismissals: number;
}

export interface ImportConflict {
  domain: ImportDomain;
  code: string;
  description: string;
  count: number;
}

export interface ImportPreview {
  exportedAt: string;
  schemaVersion: number;
  appVersion?: string;
  counts: ImportDomainCounts;
  profileIncluded: boolean;
  demoDataIncluded: boolean;
  issues: ImportIssue[];
  conflicts: ImportConflict[];
  migrationRequired: boolean;
}

export type ImportMode = 'replace' | 'merge';

export interface ImportModeOptions {
  mode: ImportMode;
  /** Merge mode only — explicit choice, never silently applied. Replace mode always uses imported (that is what "replace" means). */
  profileChoice: 'keepCurrent' | 'useImported';
  /** Excludes demo-tagged entities from the imported file before merging/replacing. */
  excludeDemoData: boolean;
}

export interface ImportResultSummary {
  mode: ImportMode;
  countsWritten: ImportDomainCounts;
  issues: ImportIssue[];
  demoMetadataAdopted: boolean;
}
