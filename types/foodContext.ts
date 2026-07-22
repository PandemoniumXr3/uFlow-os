import type { CookingEquipment, MealType } from '@/types/recipe';

export type MoodAnswer = 'low' | 'neutral' | 'good';
export type TemperatureAnswer = 'warm' | 'cold' | 'either';
export type AdventureAnswer = 'safe' | 'new' | 'either';
export type TimeAnswer = 'quick' | 'medium' | 'long';
export type BudgetAnswer = 'low' | 'medium' | 'flexible';
export type LocationAnswer = 'home' | 'work' | 'out';
export type EnergyAnswer = 'low' | 'medium' | 'high';

/**
 * A user's "Food State" for a single day — the Context Engine's output.
 * Every field is optional and editable independently via quick chips; there
 * is no blocking wizard anymore. Undefined always means "let uFlow decide"
 * (e.g. `mealType` undefined falls back to clock-based detection).
 */
export interface FoodContext {
  date: string; // YYYY-MM-DD, local time
  /** Overrides the clock-based meal-type detection when set. */
  mealType?: MealType;
  mood?: MoodAnswer;
  cravings?: string;
  temperature?: TemperatureAnswer;
  adventure?: AdventureAnswer;
  time?: TimeAnswer;
  /** "Use what I have" quick toggle — heavily biases suggestions toward what's already in Stock. */
  prioritizeAvailable?: boolean;
  budget?: BudgetAnswer;
  location?: LocationAnswer;
  energy?: EnergyAnswer;
  /** Decision-engine refinements — additive, all optional, no existing chip writes these yet except where the new Today controls set them. */
  noExtraShopping?: boolean;
  maxExtraCostCents?: number;
  maxPrepMinutes?: number;
  equipment?: CookingEquipment[];
  completedAt: number;
}

export type FoodContextAnswers = Omit<FoodContext, 'date' | 'completedAt'>;
