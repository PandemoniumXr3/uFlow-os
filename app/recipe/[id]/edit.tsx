import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { RecipeForm } from '@/components/recipes/RecipeForm';
import { IconButton } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { useProducts } from '@/hooks/useProducts';
import { useProfile } from '@/hooks/useProfile';
import { useRecipes } from '@/hooks/useRecipes';

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { recipes, isLoading, updateRecipe } = useRecipes();
  const { products } = useProducts();
  const { profile, budgetPreferences } = useProfile();

  const recipe = recipes.find((candidate) => candidate.id === id);

  if (isLoading) return <Screen />;

  if (!recipe) {
    return (
      <Screen>
        <PageHeader title="Edit recipe" rightAction={<IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />} />
        <Text>This recipe is no longer available.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title={`Edit ${recipe.name}`} rightAction={<IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <RecipeForm
          initialRecipe={recipe}
          products={products}
          nutritionTrackingEnabled={profile?.nutritionTrackingEnabled ?? false}
          budgetModeEnabled={budgetPreferences.enabled}
          onSubmit={async (draft) => {
            // Preserves id/createdAt/isFavorite and any field this form doesn't touch — never replaces the recipe with a new record.
            await updateRecipe(recipe.id, draft);
            router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } });
          }}
          onCancel={() => router.back()}
        />
      </ScrollView>
    </Screen>
  );
}
