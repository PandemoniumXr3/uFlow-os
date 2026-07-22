import { useMemo } from 'react';

import { Card } from '@/components/ui/Card';
import { InsightRow } from '@/components/ui/InsightRow';
import { spacing } from '@/constants/theme';
import type { InventoryItem } from '@/types/inventory';
import type { PlannedMeal } from '@/types/mealPlan';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { isExpiringSoon } from '@/utils/expiry';
import { generateAutomaticShoppingItems } from '@/utils/generateAutomaticShoppingItems';

type SmartAlertsProps = {
  products: Product[];
  inventoryItems: InventoryItem[];
  recipes: Recipe[];
  plannedMeals: PlannedMeal[];
  alwaysInStockProductIds: Set<string>;
};

const MAX_ALERTS = 2;

/** One quiet insight panel — never a separate card per alert — reusing Stock/Grocery's own generation logic rather than a fresh, competing computation. */
export function SmartAlerts({ products, inventoryItems, recipes, plannedMeals, alwaysInStockProductIds }: SmartAlertsProps) {
  const alerts = useMemo(() => {
    const expiringCount = inventoryItems.filter((item) => isExpiringSoon(item.expirationDate)).length;

    const automaticItems = generateAutomaticShoppingItems({
      plannedMeals,
      recipes,
      products,
      inventoryItems,
      alwaysInStockProductIds,
    });
    const neededTodayCount = automaticItems.filter((item) => item.reasons.some((reason) => reason.type === 'todayMeal')).length;

    const messages: { icon: 'time-outline' | 'cart-outline' | 'checkmark-circle-outline'; text: string; tone: 'warm' | 'neutral' | 'good' }[] = [];
    if (expiringCount > 0) {
      messages.push({ icon: 'time-outline', text: `${expiringCount} product${expiringCount === 1 ? '' : 's'} expiring soon`, tone: 'warm' });
    }
    if (neededTodayCount > 0) {
      messages.push({ icon: 'cart-outline', text: `${neededTodayCount} item${neededTodayCount === 1 ? '' : 's'} needed for today`, tone: 'neutral' });
    }
    if (messages.length === 0) {
      messages.push({ icon: 'checkmark-circle-outline', text: 'Nothing urgent to buy', tone: 'good' });
    }
    return messages.slice(0, MAX_ALERTS);
  }, [products, inventoryItems, recipes, plannedMeals, alwaysInStockProductIds]);

  return (
    <Card variant="insight" style={{ gap: spacing.sm }}>
      {alerts.map((alert) => (
        <InsightRow key={alert.text} icon={alert.icon} text={alert.text} tone={alert.tone} />
      ))}
    </Card>
  );
}
