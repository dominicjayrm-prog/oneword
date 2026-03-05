import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize, spacing, borderRadius } from '../constants/theme';

interface WordCounterProps {
  count: number;
  max: number;
}

export function WordCounter({ count, max }: WordCounterProps) {
  const { colors } = useTheme();
  const isComplete = count === max;
  const isOver = count > max;

  return (
    <View style={styles.container}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: colors.surfaceLight },
            i < count && { backgroundColor: colors.primary },
            isOver && i < count && { backgroundColor: colors.error },
          ]}
        />
      ))}
      <Text
        style={[
          styles.text,
          { color: colors.textSecondary },
          isComplete && { color: colors.success },
          isOver && { color: colors.error },
        ]}
      >
        {count}/{max}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  text: {
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
});
