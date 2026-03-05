import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../constants/theme';

interface WordCounterProps {
  count: number;
  max: number;
}

export function WordCounter({ count, max }: WordCounterProps) {
  const isComplete = count === max;
  const isOver = count > max;

  return (
    <View style={styles.container}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < count && styles.dotFilled,
            isOver && styles.dotError,
          ]}
        />
      ))}
      <Text
        style={[
          styles.text,
          isComplete && styles.textComplete,
          isOver && styles.textError,
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
    backgroundColor: colors.surfaceLight,
  },
  dotFilled: {
    backgroundColor: colors.primary,
  },
  dotError: {
    backgroundColor: colors.error,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  textComplete: {
    color: colors.success,
  },
  textError: {
    color: colors.error,
  },
});
