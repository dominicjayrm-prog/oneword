import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize, spacing } from '../constants/theme';

interface WordDisplayProps {
  word: string;
  category?: string;
}

export function WordDisplay({ word, category }: WordDisplayProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {category && <Text style={[styles.category, { color: colors.primary }]}>{category.toUpperCase()}</Text>}
      <Text style={[styles.word, { color: colors.text }]}>{word}</Text>
      <View style={[styles.underline, { backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  category: {
    fontSize: fontSize.xs,
    letterSpacing: 4,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  word: {
    fontSize: fontSize.hero,
    fontFamily: 'PlayfairDisplay_700Bold',
    letterSpacing: 2,
  },
  underline: {
    width: 60,
    height: 4,
    borderRadius: 2,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
