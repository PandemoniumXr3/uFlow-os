/** Bumped only if the curated demo dataset itself changes shape enough that an old install should be treated as stale. */
export const DEMO_DATASET_VERSION = 1;

/**
 * Tracks exactly which stored entities came from the demo install, split by
 * domain rather than one flat id list — removal needs to know which storage
 * service each id belongs to, and a bare string can't tell you that on its
 * own.
 */
export interface DemoDataMetadata {
  demoDatasetVersion: number;
  installedAt: string;
  entityIds: {
    productIds: string[];
    recipeIds: string[];
    inventoryItemIds: string[];
    mealPlanEntryIds: string[];
    /** Subset of recipeIds that were also added to SafeMealsProfile.recipeIds — removed from there too on uninstall. */
    safeMealRecipeIds: string[];
  };
}
