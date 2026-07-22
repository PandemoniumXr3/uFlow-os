export type BaseUnit = 'g' | 'ml' | 'piece';

interface UnitDefinition {
  base: BaseUnit;
  factor: number; // multiply an amount in this unit by `factor` to get the base-unit amount
}

/**
 * The fixed, exhaustive set of units Budget Mode understands. Deliberately
 * small — mass (g/kg), volume (ml/l), and count (piece/pcs/stuk) only.
 * Anything else (tablespoons, cups, "a pinch", "one banana") is not in this
 * table on purpose: guessing a conversion would silently fabricate a price,
 * which the milestone explicitly forbids.
 */
const UNIT_TABLE: Record<string, UnitDefinition> = {
  g: { base: 'g', factor: 1 },
  gram: { base: 'g', factor: 1 },
  grams: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  kilogram: { base: 'g', factor: 1000 },
  kilograms: { base: 'g', factor: 1000 },
  ml: { base: 'ml', factor: 1 },
  millilitre: { base: 'ml', factor: 1 },
  millilitres: { base: 'ml', factor: 1 },
  milliliter: { base: 'ml', factor: 1 },
  milliliters: { base: 'ml', factor: 1 },
  l: { base: 'ml', factor: 1000 },
  liter: { base: 'ml', factor: 1000 },
  liters: { base: 'ml', factor: 1000 },
  litre: { base: 'ml', factor: 1000 },
  litres: { base: 'ml', factor: 1000 },
  piece: { base: 'piece', factor: 1 },
  pieces: { base: 'piece', factor: 1 },
  pc: { base: 'piece', factor: 1 },
  pcs: { base: 'piece', factor: 1 },
  stuk: { base: 'piece', factor: 1 },
  stuks: { base: 'piece', factor: 1 },
  item: { base: 'piece', factor: 1 },
  items: { base: 'piece', factor: 1 },
};

export interface BaseQuantity {
  baseUnit: BaseUnit;
  baseQuantity: number;
}

/**
 * Converts `quantity unit` to its canonical base-unit amount. Returns null
 * for any unit outside the fixed table above, or a non-finite/negative
 * quantity — callers must treat null as "can't be estimated", never as 0.
 */
export function convertToBaseUnit(quantity: number, unit: string): BaseQuantity | null {
  if (!Number.isFinite(quantity) || quantity < 0) return null;

  const definition = UNIT_TABLE[normalizeUnit(unit)];
  if (!definition) return null;

  return { baseUnit: definition.base, baseQuantity: quantity * definition.factor };
}

/** True only when both units resolve to the same base dimension (g, ml, or piece). */
export function areUnitsCompatible(unitA: string, unitB: string): boolean {
  const a = UNIT_TABLE[normalizeUnit(unitA)];
  const b = UNIT_TABLE[normalizeUnit(unitB)];
  return a != null && b != null && a.base === b.base;
}

/**
 * The inverse of convertToBaseUnit — converts a base-unit amount (g/ml/piece)
 * back into `unit`, e.g. for subtracting a recipe's gram-based ingredient
 * deduction from a Stock quantity recorded in kilograms. Returns null for
 * any unit outside the fixed table, same discipline as the forward direction.
 */
export function convertFromBaseUnit(baseQuantity: number, unit: string): number | null {
  if (!Number.isFinite(baseQuantity) || baseQuantity < 0) return null;

  const definition = UNIT_TABLE[normalizeUnit(unit)];
  if (!definition) return null;

  return baseQuantity / definition.factor;
}

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}
