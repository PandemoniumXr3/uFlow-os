import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { spacing } from '@/constants/theme';

type AddProductRowProps = {
  onSubmit: (name: string) => void;
};

export function AddProductRow({ onSubmit }: AddProductRowProps) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name);
    setName('');
  };

  return (
    <Card variant="standard" style={styles.container}>
      <TextField
        value={name}
        onChangeText={setName}
        placeholder="Add a product…"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        autoFocus
      />
      <Button label="Add" onPress={handleSubmit} disabled={!name.trim()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
