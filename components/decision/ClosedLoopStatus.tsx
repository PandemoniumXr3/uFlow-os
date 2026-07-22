import type { Ionicons } from '@expo/vector-icons';

import { InsightRow } from '@/components/ui/InsightRow';

export type ClosedLoopState =
  | { type: 'fullyInStock' }
  | { type: 'willAddToGrocery'; count: number }
  | { type: 'afterPurchaseAddToStock' }
  | { type: 'markEatenUpdatesStock' };

type Config = {
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'neutral' | 'warm' | 'good';
  text: (state: ClosedLoopState) => string;
};

const CONFIG: Record<ClosedLoopState['type'], Config> = {
  fullyInStock: { icon: 'checkmark-circle-outline', tone: 'good', text: () => 'Everything for this meal is in Stock' },
  willAddToGrocery: {
    icon: 'cart-outline',
    tone: 'warm',
    text: (state) => {
      const count = state.type === 'willAddToGrocery' ? state.count : 0;
      return `${count} ingredient${count === 1 ? '' : 's'} will be added to Grocery`;
    },
  },
  afterPurchaseAddToStock: { icon: 'arrow-redo-outline', tone: 'neutral', text: () => 'After purchase, add them back to Stock' },
  markEatenUpdatesStock: { icon: 'repeat-outline', tone: 'neutral', text: () => 'Marking this eaten can update Stock' },
};

/**
 * The one compact, reusable line that names where a screen sits in uFlow's
 * closed loop (Stock -> meals -> Grocery -> Stock). Deliberately just an
 * InsightRow with a fixed vocabulary of copy/icon/tone per state, so no
 * screen re-writes this wording itself — and deliberately never more than
 * one line, never a diagram.
 */
export function ClosedLoopStatus({ state }: { state: ClosedLoopState }) {
  const config = CONFIG[state.type];
  return <InsightRow icon={config.icon} tone={config.tone} text={config.text(state)} />;
}
