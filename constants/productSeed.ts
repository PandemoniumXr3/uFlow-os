import type { ProductCategory } from '@/types/product';

/**
 * Standard starter database so new users don't begin with an empty list.
 * Every user can remove items they don't want or favorite the ones they do —
 * this is just a reasonable default, not a fixed catalog.
 */
export const DEFAULT_PRODUCTS: { name: string; category: ProductCategory }[] = [
  // Dairy & Alternatives
  ...[
    'Milk',
    'Almond Milk',
    'Oat Milk',
    'Soy Milk',
    'Greek Yogurt',
    'Yogurt',
    'Butter',
    'Cheese',
    'Cheddar',
    'Mozzarella',
    'Parmesan',
    'Cottage Cheese',
  ].map((name) => ({ name, category: 'Dairy & Alternatives' as const })),

  // Bread & Bakery
  ...['Bread', 'Whole Wheat Bread', 'Sourdough Bread', 'Burger Buns', 'Wraps', 'Bagels', 'Tortillas', 'Croissants'].map(
    (name) => ({ name, category: 'Bread & Bakery' as const })
  ),

  // Breakfast
  ...['Granola', 'Oats', 'Muesli', 'Cornflakes', 'Pancake Mix', 'Peanut Butter', 'Jam', 'Honey'].map((name) => ({
    name,
    category: 'Breakfast' as const,
  })),

  // Fruit
  ...[
    'Banana',
    'Apple',
    'Orange',
    'Strawberry',
    'Blueberries',
    'Raspberries',
    'Grapes',
    'Mango',
    'Pineapple',
    'Kiwi',
    'Pear',
    'Watermelon',
    'Lemon',
    'Lime',
    'Avocado',
  ].map((name) => ({ name, category: 'Fruit' as const })),

  // Vegetables
  ...[
    'Lettuce',
    'Tomato',
    'Cucumber',
    'Bell Pepper',
    'Onion',
    'Garlic',
    'Spinach',
    'Carrot',
    'Broccoli',
    'Cauliflower',
    'Mushroom',
    'Corn',
    'Peas',
    'Zucchini',
    'Sweet Potato',
    'Potato',
  ].map((name) => ({ name, category: 'Vegetables' as const })),

  // Grains & Rice
  ...['White Rice', 'Brown Rice', 'Sushi Rice', 'Pasta', 'Spaghetti', 'Penne', 'Noodles', 'Couscous', 'Quinoa'].map(
    (name) => ({ name, category: 'Grains & Rice' as const })
  ),

  // Protein
  ...[
    'Chicken',
    'Beef',
    'Turkey',
    'Salmon',
    'Tuna',
    'Eggs',
    'Tofu',
    'Tempeh',
    'Vegan Burger',
    'Beyond Burger',
    'Vegan Chicken',
    'Vegan Nuggets',
    'Falafel',
  ].map((name) => ({ name, category: 'Protein' as const })),

  // Frozen
  ...['Gyoza', 'Pizza', 'Fries', 'Hash Browns', 'Mixed Vegetables'].map((name) => ({
    name,
    category: 'Frozen' as const,
  })),

  // Pantry
  ...[
    'Olive Oil',
    'Salt',
    'Black Pepper',
    'Paprika',
    'Curry Powder',
    'Soy Sauce',
    'Ketchup',
    'Mayonnaise',
    'Mustard',
    'BBQ Sauce',
    'Tomato Sauce',
    'Pesto',
    'Protein Powder',
    'Cacao Powder',
  ].map((name) => ({ name, category: 'Pantry' as const })),

  // Nuts & Seeds
  ...['Almonds', 'Cashews', 'Walnuts', 'Chia Seeds', 'Pumpkin Seeds'].map((name) => ({
    name,
    category: 'Nuts & Seeds' as const,
  })),

  // Snacks & Treats
  ...['Dark Chocolate', 'Milk Chocolate', 'Cookies', 'Crackers', 'Popcorn', 'Protein Bar', 'Rice Cakes', 'Pretzels'].map(
    (name) => ({ name, category: 'Snacks & Treats' as const })
  ),

  // Drinks
  ...['Water', 'Sparkling Water', 'Coffee', 'Tea', 'Orange Juice', 'Apple Juice', 'Smoothie', 'Protein Shake'].map(
    (name) => ({ name, category: 'Drinks' as const })
  ),

  // Desserts
  ...['Ice Cream', 'Frozen Yogurt', 'Acai', 'Frozen Mango', 'Frozen Berries'].map((name) => ({
    name,
    category: 'Desserts' as const,
  })),
];
