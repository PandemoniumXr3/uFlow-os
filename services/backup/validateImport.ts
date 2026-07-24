import { EXPORT_SCHEMA_VERSION, MIN_SUPPORTED_SCHEMA_VERSION, type ImportIssue, type ImportValidationResult, type UFlowExport } from '@/types/backup';

const VALID_STOCK_STATUS = new Set(['inStock', 'low', 'empty']);
const VALID_LOCATION = new Set(['pantry', 'fridge', 'freezer', 'other']);
const VALID_INVENTORY_SOURCE = new Set(['manual', 'barcode', 'ocr']);
const VALID_EFFORT = new Set(['low', 'medium', 'high']);
const VALID_DISMISSAL_SCOPE = new Set(['day', 'permanent']);
const VALID_ONBOARDING_STATUS = new Set(['not_started', 'in_progress', 'completed', 'skipped']);

function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isValidIsoString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function findDuplicateIds(items: { id?: unknown }[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const item of items) {
    if (typeof item.id !== 'string') continue;
    if (seen.has(item.id)) duplicates.add(item.id);
    seen.add(item.id);
  }
  return duplicates;
}

/**
 * Parses and validates a raw import file end to end. Never writes anything
 * — this is read-only analysis. Returns `data` (the parsed export, still
 * unmigrated) whenever parsing + top-level structure succeed, even if
 * entity-level issues exist, so the caller can still show a preview
 * alongside blocking issues; `canProceed` is the only thing that gates
 * whether an import may actually run.
 */
export function validateImportFile(rawText: string): ImportValidationResult {
  const issues: ImportIssue[] = [];

  if (rawText.length === 0) {
    issues.push({ severity: 'blocking', domain: 'file', code: 'empty_file', message: 'The selected file is empty.' });
    return { issues, canProceed: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    issues.push({ severity: 'blocking', domain: 'file', code: 'invalid_json', message: 'This file is not valid JSON and cannot be read.' });
    return { issues, canProceed: false };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    issues.push({ severity: 'blocking', domain: 'schema', code: 'invalid_top_level_shape', message: 'This file does not look like a uFlow backup.' });
    return { issues, canProceed: false };
  }

  const obj = parsed as Record<string, unknown>;
  const schemaVersion = obj.schemaVersion;
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion)) {
    issues.push({ severity: 'blocking', domain: 'schema', code: 'missing_schema_version', message: 'This file has no recognizable schema version.' });
    return { issues, canProceed: false };
  }

  if (schemaVersion > EXPORT_SCHEMA_VERSION) {
    issues.push({
      severity: 'blocking',
      domain: 'schema',
      code: 'unsupported_schema_future',
      message: `This backup was made with a newer version of uFlow (schema v${schemaVersion}) than this app supports (v${EXPORT_SCHEMA_VERSION}). Update the app before importing.`,
    });
    return { issues, canProceed: false, schemaVersion };
  }

  if (schemaVersion < MIN_SUPPORTED_SCHEMA_VERSION) {
    issues.push({
      severity: 'blocking',
      domain: 'schema',
      code: 'unsupported_schema_old',
      message: `This backup's schema (v${schemaVersion}) is too old for this app to migrate.`,
    });
    return { issues, canProceed: false, schemaVersion };
  }

  if (!isValidIsoString(obj.exportedAt)) {
    issues.push({ severity: 'warning', domain: 'schema', code: 'invalid_exported_at', message: 'This backup has no valid export date.' });
  }

  if (typeof obj.data !== 'object' || obj.data === null || Array.isArray(obj.data)) {
    issues.push({ severity: 'blocking', domain: 'schema', code: 'missing_data', message: 'This backup has no data section.' });
    return { issues, canProceed: false, schemaVersion };
  }

  const data = obj.data as Record<string, unknown>;

  validateProfile(data.profile, issues);
  validateArrayDomain(data.products, 'products', issues, validateProduct);
  validateArrayDomain(data.recipes, 'recipes', issues, validateRecipe);
  validateArrayDomain(data.inventory, 'inventory', issues, validateInventoryItem);
  validateArrayDomain(data.manualGroceryItems, 'manualGroceryItems', issues, validateShoppingItem);
  validateArrayDomain(data.mealPlan, 'mealPlan', issues, validatePlannedMeal);
  validateArrayDomain(data.mealHistory, 'mealHistory', issues, validateMealLogEntry);
  validateArrayDomain(data.dismissals, 'dismissals', issues, validateDismissal);
  validateDemoMetadata(data.demoMetadata, issues);
  checkCrossReferences(data, issues);

  const canProceed = !issues.some((issue) => issue.severity === 'blocking');
  // `data` is returned even when blocking entity-level issues exist (never when the top-level
  // shape itself was invalid — those branches already returned early above) so a preview can still
  // show counts/issues together; `canProceed` alone gates whether an import may actually run.
  return { issues, canProceed, schemaVersion, data: parsed as UFlowExport };
}

function validateArrayDomain(
  value: unknown,
  domain: ImportIssue['domain'],
  issues: ImportIssue[],
  validateEntity: (entity: Record<string, unknown>, index: number, domain: ImportIssue['domain'], issues: ImportIssue[]) => void
): void {
  if (value === undefined) return; // absent domain is fine — older/partial backups, treated as "nothing to import here"
  if (!Array.isArray(value)) {
    issues.push({ severity: 'blocking', domain, code: 'not_an_array', message: `"${domain}" is malformed — expected a list.` });
    return;
  }
  const duplicates = findDuplicateIds(value as { id?: unknown }[]);
  for (const id of duplicates) {
    issues.push({ severity: 'blocking', domain, code: 'duplicate_id_in_file', message: `Multiple ${domain} entries share id "${id}" — cannot resolve which is correct.`, entityId: id });
  }
  value.forEach((entity, index) => {
    if (typeof entity !== 'object' || entity === null) {
      issues.push({ severity: 'blocking', domain, code: 'malformed_entity', message: `${domain}[${index}] is not a valid record.` });
      return;
    }
    validateEntity(entity as Record<string, unknown>, index, domain, issues);
  });
}

function validateProfile(value: unknown, issues: ImportIssue[]): void {
  if (value === undefined || value === null) return;
  if (typeof value !== 'object') {
    issues.push({ severity: 'blocking', domain: 'profile', code: 'malformed_profile', message: 'The included profile is malformed.' });
    return;
  }
  const profile = value as Record<string, unknown>;
  if (!isNonEmptyString(profile.id) || typeof profile.createdAt !== 'number' || typeof profile.updatedAt !== 'number') {
    issues.push({ severity: 'blocking', domain: 'profile', code: 'malformed_profile', message: 'The included profile is missing required fields.' });
    return;
  }
  if (profile.onboarding !== undefined) {
    const onboarding = profile.onboarding as Record<string, unknown> | null;
    if (
      typeof onboarding !== 'object' ||
      onboarding === null ||
      !VALID_ONBOARDING_STATUS.has(onboarding.status as string) ||
      !isNonNegativeInteger(onboarding.currentStep) ||
      typeof onboarding.version !== 'number'
    ) {
      issues.push({ severity: 'blocking', domain: 'profile', code: 'malformed_onboarding', message: 'The included onboarding state is malformed.' });
    }
  }
}

function validateProduct(entity: Record<string, unknown>, index: number, domain: ImportIssue['domain'], issues: ImportIssue[]): void {
  if (!isNonEmptyString(entity.id) || !isNonEmptyString(entity.name) || !isNonEmptyString(entity.category)) {
    issues.push({ severity: 'blocking', domain, code: 'malformed_entity', message: `products[${index}] is missing an id, name, or category.` });
  }
}

function validateRecipe(entity: Record<string, unknown>, index: number, domain: ImportIssue['domain'], issues: ImportIssue[]): void {
  if (!isNonEmptyString(entity.id) || !isNonEmptyString(entity.name) || !Array.isArray(entity.mealType) || !Array.isArray(entity.ingredients)) {
    issues.push({ severity: 'blocking', domain, code: 'malformed_entity', message: `recipes[${index}] is missing required fields.` });
    return;
  }
  if (entity.effort !== undefined && !VALID_EFFORT.has(entity.effort as string)) {
    issues.push({ severity: 'blocking', domain, code: 'invalid_enum', message: `recipes[${index}] has an invalid effort value.`, entityId: entity.id as string });
  }
  if (entity.time !== undefined && !isNonNegativeNumber(entity.time)) {
    issues.push({ severity: 'blocking', domain, code: 'invalid_quantity', message: `recipes[${index}] has an invalid time value.`, entityId: entity.id as string });
  }
  if (Array.isArray(entity.ingredientLines)) {
    entity.ingredientLines.forEach((line: unknown, lineIndex: number) => {
      if (typeof line !== 'object' || line === null) return;
      const l = line as Record<string, unknown>;
      if (l.quantity !== undefined && !isNonNegativeNumber(l.quantity)) {
        issues.push({
          severity: 'blocking',
          domain,
          code: 'invalid_quantity',
          message: `recipes[${index}].ingredientLines[${lineIndex}] has a negative or invalid quantity.`,
          entityId: entity.id as string,
        });
      }
    });
  }
}

function validateInventoryItem(entity: Record<string, unknown>, index: number, domain: ImportIssue['domain'], issues: ImportIssue[]): void {
  if (!isNonEmptyString(entity.id) || !isNonEmptyString(entity.productId)) {
    issues.push({ severity: 'blocking', domain, code: 'malformed_entity', message: `inventory[${index}] is missing an id or productId.` });
    return;
  }
  if (entity.stockStatus !== undefined && !VALID_STOCK_STATUS.has(entity.stockStatus as string)) {
    issues.push({ severity: 'blocking', domain, code: 'invalid_enum', message: `inventory[${index}] has an invalid stockStatus.`, entityId: entity.id as string });
  }
  if (entity.location !== undefined && !VALID_LOCATION.has(entity.location as string)) {
    issues.push({ severity: 'blocking', domain, code: 'invalid_enum', message: `inventory[${index}] has an invalid location.`, entityId: entity.id as string });
  }
  if (entity.source !== undefined && !VALID_INVENTORY_SOURCE.has(entity.source as string)) {
    issues.push({ severity: 'blocking', domain, code: 'invalid_enum', message: `inventory[${index}] has an invalid source.`, entityId: entity.id as string });
  }
  if (entity.quantity !== undefined && !isNonNegativeNumber(entity.quantity)) {
    issues.push({ severity: 'blocking', domain, code: 'invalid_quantity', message: `inventory[${index}] has a negative or invalid quantity.`, entityId: entity.id as string });
  }
  if (entity.lastPurchasePriceCents !== undefined && !isNonNegativeInteger(entity.lastPurchasePriceCents)) {
    issues.push({ severity: 'blocking', domain, code: 'invalid_money', message: `inventory[${index}] has an invalid price.`, entityId: entity.id as string });
  }
  for (const dateField of ['expirationDate', 'purchaseDate', 'openedDate'] as const) {
    if (entity[dateField] !== undefined && !isValidDateString(entity[dateField])) {
      issues.push({ severity: 'blocking', domain, code: 'invalid_date', message: `inventory[${index}].${dateField} is not a valid date.`, entityId: entity.id as string });
    }
  }
}

function validateShoppingItem(entity: Record<string, unknown>, index: number, domain: ImportIssue['domain'], issues: ImportIssue[]): void {
  if (!isNonEmptyString(entity.id) || !isNonEmptyString(entity.displayName)) {
    issues.push({ severity: 'blocking', domain, code: 'malformed_entity', message: `manualGroceryItems[${index}] is missing an id or displayName.` });
    return;
  }
  if (entity.quantity !== undefined && !isNonNegativeNumber(entity.quantity)) {
    issues.push({ severity: 'blocking', domain, code: 'invalid_quantity', message: `manualGroceryItems[${index}] has a negative or invalid quantity.`, entityId: entity.id as string });
  }
}

function validatePlannedMeal(entity: Record<string, unknown>, index: number, domain: ImportIssue['domain'], issues: ImportIssue[]): void {
  if (!isNonEmptyString(entity.id) || !isValidDateString(entity.date)) {
    issues.push({ severity: 'blocking', domain, code: 'malformed_entity', message: `mealPlan[${index}] is missing an id or has an invalid date.` });
    return;
  }
  if (!entity.recipeId && !(entity.isCustom && isNonEmptyString(entity.customName))) {
    issues.push({ severity: 'blocking', domain, code: 'malformed_entity', message: `mealPlan[${index}] has neither a recipe nor a custom meal name.`, entityId: entity.id as string });
  }
  if (entity.servings !== undefined && (!isNonNegativeNumber(entity.servings) || entity.servings === 0)) {
    issues.push({ severity: 'blocking', domain, code: 'invalid_quantity', message: `mealPlan[${index}] has an invalid servings value.`, entityId: entity.id as string });
  }
}

function validateMealLogEntry(entity: Record<string, unknown>, index: number, domain: ImportIssue['domain'], issues: ImportIssue[]): void {
  if (!isValidDateString(entity.date)) {
    issues.push({ severity: 'blocking', domain, code: 'invalid_date', message: `mealHistory[${index}] has an invalid date.` });
  }
  if (entity.servings !== undefined && !isNonNegativeNumber(entity.servings)) {
    issues.push({ severity: 'blocking', domain, code: 'invalid_quantity', message: `mealHistory[${index}] has an invalid servings value.` });
  }
}

function validateDismissal(entity: Record<string, unknown>, index: number, domain: ImportIssue['domain'], issues: ImportIssue[]): void {
  if (!isNonEmptyString(entity.id) || !isNonEmptyString(entity.recipeId) || !VALID_DISMISSAL_SCOPE.has(entity.scope as string)) {
    issues.push({ severity: 'blocking', domain, code: 'malformed_entity', message: `dismissals[${index}] is missing required fields or has an invalid scope.` });
    return;
  }
  if (entity.scope === 'day' && !isValidDateString(entity.date)) {
    issues.push({ severity: 'blocking', domain, code: 'invalid_date', message: `dismissals[${index}] is a day-scoped dismissal with an invalid date.`, entityId: entity.id as string });
  }
}

function validateDemoMetadata(value: unknown, issues: ImportIssue[]): void {
  if (value === undefined || value === null) return;
  if (typeof value !== 'object') {
    issues.push({ severity: 'blocking', domain: 'demoMetadata', code: 'malformed_demo_metadata', message: 'The included demo metadata is malformed.' });
    return;
  }
  const meta = value as Record<string, unknown>;
  const entityIds = meta.entityIds as Record<string, unknown> | undefined;
  const hasValidEntityIds =
    typeof entityIds === 'object' &&
    entityIds !== null &&
    Array.isArray(entityIds.productIds) &&
    Array.isArray(entityIds.recipeIds) &&
    Array.isArray(entityIds.inventoryItemIds) &&
    Array.isArray(entityIds.mealPlanEntryIds) &&
    Array.isArray(entityIds.safeMealRecipeIds);
  if (typeof meta.demoDatasetVersion !== 'number' || !isValidIsoString(meta.installedAt) || !hasValidEntityIds) {
    issues.push({ severity: 'blocking', domain: 'demoMetadata', code: 'malformed_demo_metadata', message: 'The included demo metadata is malformed.' });
  }
}

/** Broken references never block an import — the referenced entity may exist in the *current* data, or the merge step will simply skip the dangling reference. Purely informational. */
function checkCrossReferences(data: Record<string, unknown>, issues: ImportIssue[]): void {
  const products = Array.isArray(data.products) ? (data.products as Record<string, unknown>[]) : [];
  const recipes = Array.isArray(data.recipes) ? (data.recipes as Record<string, unknown>[]) : [];
  const productIds = new Set(products.map((p) => p.id));
  const recipeIds = new Set(recipes.map((r) => r.id));

  const names = new Map<string, number>();
  for (const product of products) {
    if (!isNonEmptyString(product.name)) continue;
    const normalized = product.name.trim().toLowerCase();
    names.set(normalized, (names.get(normalized) ?? 0) + 1);
  }
  for (const [name, count] of names) {
    if (count > 1) {
      issues.push({ severity: 'warning', domain: 'products', code: 'duplicate_normalized_name', message: `"${name}" appears ${count} times among imported Products.` });
    }
  }

  if (Array.isArray(data.inventory)) {
    for (const item of data.inventory as Record<string, unknown>[]) {
      if (isNonEmptyString(item.productId) && !productIds.has(item.productId)) {
        issues.push({ severity: 'warning', domain: 'inventory', code: 'unresolved_product_reference', message: `A Stock item references a Product not present in this backup — it will be created.`, entityId: item.id as string });
      }
    }
  }

  if (Array.isArray(data.mealPlan)) {
    for (const meal of data.mealPlan as Record<string, unknown>[]) {
      if (isNonEmptyString(meal.recipeId) && !recipeIds.has(meal.recipeId)) {
        issues.push({ severity: 'warning', domain: 'mealPlan', code: 'unresolved_recipe_reference', message: `A planned meal references a Recipe not present in this backup.`, entityId: meal.id as string });
      }
    }
  }
}
