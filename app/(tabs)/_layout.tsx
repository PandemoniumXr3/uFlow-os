import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { PremiumTabBar } from '@/components/navigation/PremiumTabBar';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  return ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color as string} />
  );
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <PremiumTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: tabIcon('sunny', 'sunny-outline') }} />
      <Tabs.Screen name="week" options={{ title: 'Week', tabBarIcon: tabIcon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recipes', tabBarIcon: tabIcon('book', 'book-outline') }} />
      <Tabs.Screen name="stock" options={{ title: 'Stock', tabBarIcon: tabIcon('cube', 'cube-outline') }} />
      <Tabs.Screen name="grocery" options={{ title: 'Grocery', tabBarIcon: tabIcon('cart', 'cart-outline') }} />
      {/* Products is a secondary catalog tool, reached from Stock — not a primary tab, but the route stays navigable. */}
      <Tabs.Screen name="products" options={{ href: null }} />
    </Tabs>
  );
}
