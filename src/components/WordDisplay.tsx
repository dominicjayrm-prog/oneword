import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '../constants/theme';

interface WordDisplayProps {
  word: string;
  category?: string;
}

export function WordDisplay({ word, category }: WordDisplayProps) {
  return (
    <View style={styles.container}>
      {category && (
        <Text style={styles.category}>{category.toUpperCase()}</Text>
      )}
      <Text style={styles.word}>{word}</Text>
      <View style={styles.underline} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  category: {
    fontSize: fontSize.xs,
    color: colors.primary,
    letterSpacing: 4,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  word: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 6,
  },
  underline: {
    width: 60,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginTop: spacing.md,
  },
});
