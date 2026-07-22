import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { colors, spacing, typography } from '@/constants/theme';
import type { NewManualShoppingItem } from '@/types/shoppingItem';
import type { Product } from '@/types/product';

type AddManualItemFormProps = {
  products: Product[];
  onAdd: (input: NewManualShoppingItem) => void;
  onCancel: () => void;
};

export function AddManualItemForm({ products, onAdd, onCancel }: AddManualItemFormProps) {
  const [name, setName] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');

  const suggestions = useMemo(() => {
    const query = name.trim().toLowerCase();
    if (!query || matchedProduct) return [];
    return products.filter((product) => product.name.toLowerCase().includes(query)).slice(0, 6);
  }, [products, name, matchedProduct]);

  function reset() {
    setName('');
    setMatchedProduct(null);
    setQuantity('');
    setUnit('');
  }

  function handleSubmit() {
    const displayName = matchedProduct?.name ?? name;
    if (!displayName.trim()) return;
    const parsedQuantity = quantity.trim() ? Number(quantity) : undefined;
    onAdd({
      displayName,
      productId: matchedProduct?.id,
      quantity: Number.isNaN(parsedQuantity as number) ? undefined : parsedQuantity,
      unit: unit.trim() || undefined,
    });
    reset();
    onCancel();
  }

  return (
    <Card variant="standard" style={styles.container}>
      <Text style={styles.title}>Add item</Text>

      <TextField
        value={matchedProduct ? matchedProduct.name : name}
        onChangeText={(text) => {
          setMatchedProduct(null);
          setName(text);
        }}
        placeholder="What do you need?"
        editable={!matchedProduct}
      />
      {matchedProduct && (
        <Text style={styles.changeLink} onPress={() => setMatchedProduct(null)}>
          Change
        </Text>
      )}
      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((product) => (
            <Chip key={product.id} label={product.name} onPress={() => setMatchedProduct(product)} />
          ))}
        </View>
      )}

      <View style={styles.row}>
        <TextField value={quantity} onChangeText={setQuantity} placeholder="Qty" keyboardType="numeric" style={styles.half} />
        <TextField value={unit} onChangeText={setUnit} placeholder="Unit" style={styles.half} />
      </View>

      <Button label="Add to list" onPress={handleSubmit} />
      <Button
        label="Cancel"
        variant="quiet"
        compact
        onPress={() => {
          reset();
          onCancel();
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },
  changeLink: {
    color: colors.accentBlue,
    fontSize: typography.size.sm,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
});
