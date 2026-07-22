/**
 * Seeds the current local profile's safe meals for development/testing —
 * this is personal data, not a universal property of the meal database.
 * A future user starts with an empty list.
 *
 * The current dev profile is vegetarian, so no fish/meat meals are seeded
 * here (e.g. Poké Bowl is deliberately excluded — it contains salmon).
 */
export const DEFAULT_SAFE_MEAL_IDS: string[] = [
  'acai-bowl',
  'acai-protein-bowl',
  'mango-smoothie-bowl',
  'chocolate-smoothie-bowl',
  'cacao-bowl',
  'granola-bowl',
  'bagel',
  'tosti',
  'grilled-cheese',
  'mango-smoothie',
  'chocolate-shake',
  'protein-shake',
  'gyoza-plate',
  'pizza-margherita',
  'vegan-chicken-burger',
  'vegan-burger',
  'beyond-burger',
  'sushi-rice-bowl',
  'loaded-fries',
  'protein-pancakes',
  'pancakes',
  'cheese-toast',
  'falafel-wrap',
  'crispy-tofu-bowl',
  'rice-noodle-bowl',
  'vegetarian-gyoza-bowl',
  'ninja-creami-chocolate',
  'ninja-creami-mango',
  'oreo-protein-bowl',
  'smoothie',
  'acai-smoothie',
  'brioche-sandwich',
  'veggie-nuggets-fries',
];
