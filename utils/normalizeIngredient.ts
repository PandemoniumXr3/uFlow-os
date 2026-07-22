/**
 * A handful of genuine spelling/naming variants that accent-stripping alone
 * won't catch (typos, abbreviations, regional naming). Keep this small —
 * this is normalization, not a synonym dictionary.
 */
const ALIAS_MAP: Record<string, string> = {
  vega: 'vegan',
  'vega burger': 'vegan burger',
  'vega chicken burger': 'vegan chicken burger',
  pepper: 'bell pepper',
  'soya sauce': 'soy sauce',
};

/**
 * Normalizes a product/ingredient name for comparison only — never for
 * display. Lowercases, trims, strips accents (açaí -> acai), collapses
 * whitespace, and resolves a small alias map (vega burger -> vegan burger).
 */
export function normalizeIngredient(input: string): string {
  const stripped = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  return ALIAS_MAP[stripped] ?? stripped;
}
