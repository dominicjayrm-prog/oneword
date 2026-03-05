import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../constants/theme';

interface LeaderboardRowProps {
  rank: number;
  username: string;
  description: string;
  votes: number;
  isCurrentUser?: boolean;
}

export function LeaderboardRow({ rank, username, description, votes, isCurrentUser }: LeaderboardRowProps) {
  const getRankStyle = () => {
    if (rank === 1) return styles.gold;
    if (rank === 2) return styles.silver;
    if (rank === 3) return styles.bronze;
    return {};
  };

  return (
    <View style={[styles.row, isCurrentUser && styles.highlighted]}>
      <View style={[styles.rankBadge, getRankStyle()]}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.username}>@{username}</Text>
      </View>
      <View style={styles.votesContainer}>
        <Text style={styles.votes}>{votes}</Text>
        <Text style={styles.votesLabel}>votes</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlighted: {
    borderColor: colors.primary,
    backgroundColor: '#1a1008',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  gold: { backgroundColor: '#FFD700' },
  silver: { backgroundColor: '#C0C0C0' },
  bronze: { backgroundColor: '#CD7F32' },
  rankText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.background,
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  username: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  votesContainer: {
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  votes: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.primary,
  },
  votesLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
});
