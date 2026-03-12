import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { FavouriteButton } from './FavouriteButton';
import { fontSize, spacing, borderRadius } from '../constants/theme';

interface LeaderboardRowProps {
  rank: number;
  username: string;
  description: string;
  votes: number;
  isCurrentUser?: boolean;
  badgeEmoji?: string | null;
  descriptionId?: string;
  isFavourited?: boolean;
  onFavouriteToggle?: (nowFavourited: boolean) => void;
}

export function LeaderboardRow({
  rank,
  username,
  description,
  votes,
  isCurrentUser,
  badgeEmoji,
  descriptionId,
  isFavourited,
  onFavouriteToggle,
}: LeaderboardRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const getRankBg = () => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return colors.surfaceLight;
  };

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
        isCurrentUser && { borderColor: colors.primary, backgroundColor: colors.primaryFaded },
      ]}
    >
      <View style={[styles.rankBadge, { backgroundColor: getRankBg() }]}>
        <Text style={[styles.rankText, { color: rank <= 3 ? '#1A1A2E' : colors.text }]}>{rank}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.description, { color: colors.text }]}>{description}</Text>
        <Text style={[styles.username, { color: colors.textMuted }]}>
          @{username}
          {badgeEmoji ? ` ${badgeEmoji}` : ''}
        </Text>
      </View>
      <View style={styles.votesContainer}>
        <Text style={[styles.votes, { color: colors.primary }]}>{votes}</Text>
        <Text style={[styles.votesLabel, { color: colors.textMuted }]}>{t('share.votes')}</Text>
      </View>
      {descriptionId && (
        <View style={styles.heartContainer}>
          <FavouriteButton
            descriptionId={descriptionId}
            isFavourited={isFavourited ?? false}
            onToggle={onFavouriteToggle}
            size={13}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rankText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: 2,
  },
  username: {
    fontSize: fontSize.xs,
  },
  votesContainer: {
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  votes: {
    fontSize: fontSize.lg,
    fontFamily: 'DMMono_500Medium',
    fontWeight: '800',
  },
  votesLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  heartContainer: {
    marginLeft: spacing.sm,
  },
});
