/**
 * Money is always stored/passed as integer cents — never a float euro
 * amount — so repeated arithmetic (summing ingredient costs, scaling by
 * servings) can't drift from floating-point rounding.
 */
export function formatCents(cents: number, locale = 'nl-NL'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/**
 * Parses user-entered text ("3,50" or "3.50") into integer cents. Returns
 * null for anything that isn't a valid non-negative amount — callers decide
 * how to handle invalid input, this never throws or clamps silently.
 */
export function parseToCents(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (normalized === '') return null;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;

  return Math.round(value * 100);
}
