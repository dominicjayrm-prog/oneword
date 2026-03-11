import { View, Text, StyleSheet } from 'react-native';
import { getCurrentBadge } from '../lib/badges';
import { fontSize, spacing, borderRadius, withOpacity } from '../constants/theme';

interface BadgePillProps {
  streak: number;
  showName?: boolean;
  size?: 'sm' | 'md';
}

export function BadgePill({ streak, showName = false, size = 'sm' }: BadgePillProps) {
  const badge = getCurrentBadge(streak);
  if (!badge) return null;

  const emojiSize = size === 'md' ? 18 : 14;

  if (!showName) {
    return <Text style={{ fontSize: emojiSize }}>{badge.emoji}</Text>;
  }

  return (
    <View style={[styles.pill, { backgroundColor: withOpacity(badge.color, 0.1) }]}>
      <Text style={{ fontSize: emojiSize }}>{badge.emoji}</Text>
      <Text style={[styles.name, { color: badge.color, fontSize: size === 'md' ? fontSize.sm : fontSize.xs }]}>
        {badge.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  name: {
    fontWeight: '700',
  },
});
