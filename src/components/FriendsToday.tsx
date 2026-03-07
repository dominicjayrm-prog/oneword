import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize, spacing, borderRadius } from '../constants/theme';
import type { FriendDescription } from '../lib/friends';

interface Props {
  descriptions: FriendDescription[];
  wordText: string;
  userHasPlayed: boolean;
}

export function FriendsToday({ descriptions, wordText, userHasPlayed }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (descriptions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.wordLabel, { color: colors.textMuted }]}>
        Today: {wordText}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('friends.today_title')}
      </Text>

      {!userHasPlayed && (
        <View style={[styles.lockBanner, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Text style={[styles.lockText, { color: colors.primary }]}>
            {t('friends.play_first')}
          </Text>
        </View>
      )}

      {descriptions.map((fd) => (
        <View key={fd.friend_id} style={[styles.friendRow, { borderColor: colors.border }]}>
          <View style={styles.friendHeader}>
            <View style={styles.friendLeft}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}>
                <Text style={styles.avatarText}>{fd.friend_avatar_url || '\uD83C\uDFAD'}</Text>
              </View>
              <Text style={[styles.friendName, { color: colors.text }]}>@{fd.friend_username}</Text>
            </View>
            {fd.friend_streak > 0 && (
              <Text style={[styles.streak, { color: colors.primary }]}>
                {'\uD83D\uDD25'} {fd.friend_streak}
              </Text>
            )}
          </View>

          {!userHasPlayed ? (
            <Text style={[styles.lockedDesc, { color: colors.textMuted }]}>
              {'\uD83D\uDD12'} {t('friends.locked')}
            </Text>
          ) : fd.has_played && fd.description_text ? (
            <View style={styles.descRow}>
              <Text style={[styles.description, { color: colors.text }]} numberOfLines={2}>
                &ldquo;{fd.description_text}&rdquo;
              </Text>
              {fd.elo_rating != null && (
                <Text style={[styles.elo, { color: colors.textMuted }]}>
                  {Math.round(fd.elo_rating)}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[styles.notPlayed, { color: colors.textMuted }]}>
              {t('friends.hasnt_played')}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  wordLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  lockBanner: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  lockText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  friendRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  friendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  friendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 14,
  },
  friendName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  streak: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  descRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 36,
  },
  description: {
    fontSize: fontSize.sm,
    flex: 1,
    fontStyle: 'italic',
  },
  elo: {
    fontSize: fontSize.xs,
    fontFamily: 'DMMono_500Medium',
    marginLeft: spacing.sm,
  },
  lockedDesc: {
    fontSize: fontSize.sm,
    paddingLeft: 36,
  },
  notPlayed: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    paddingLeft: 36,
  },
});
