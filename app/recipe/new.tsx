import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';

import { RecipeForm } from '@/components/recipes/RecipeForm';
import { IconButton } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { useProducts } from '@/hooks/useProducts';
import { useProfile } from '@/hooks/useProfile';
import { useRecipes } from '@/hooks/useRecipes';

export default function NewRecipeScreen() {
  const router = useRouter();
  const { addRecipe } = useRecipes();
  const { products } = useProducts();
  const { profile, budgetPreferences } = useProfile();

  return (
    <Screen>
      <PageHeader title="Add recipe" rightAction={<IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <RecipeForm
          products={products}
          nutritionTrackingEnabled={profile?.nutritionTrackingEnabled ?? false}
          budgetModeEnabled={budgetPreferences.enabled}
          onSubmit={async (draft) => {
            const recipe = await addRecipe(draft);
            if (!recipe) return;
            router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } });
          }}
          onCancel={() => router.back()}
        />
      </ScrollView>
    </Screen>
  );
}
