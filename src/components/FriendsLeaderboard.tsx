import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { useGameContext } from '../contexts/GameContext';
import { getFriendsDescriptions, type FriendDescription } from '../lib/friends';
import { LeaderboardRow } from './LeaderboardRow';
import { LoadingSpinner } from './LoadingSpinner';
import { fontSize, spacing } from '../constants/theme';

export function FriendsLeaderboard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session } = useAuthContext();
  const { todayWord, hasSubmitted } = useGameContext();
  const [descriptions, setDescriptions] = useState<FriendDescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!session?.user?.id || !todayWord?.id) {
        setLoading(false);
        return;
      }
      const data = await getFriendsDescriptions(session.user.id, todayWord.id);
      setDescriptions(data);
      setLoading(false);
    }
    load();
  }, [session?.user?.id, todayWord?.id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!hasSubmitted) {
    return (
      <View style={styles.center}>
        <Text style={[styles.lockText, { color: colors.primary }]}>
          {t('friends.play_first')}
        </Text>
      </View>
    );
  }

  if (descriptions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('friends.empty_title')}
        </Text>
      </View>
    );
  }

  const played = descriptions
    .filter((d) => d.description_text)
    .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
  const notPlayed = descriptions.filter((d) => !d.description_text);

  return (
    <View style={styles.container}>
      {played.map((fd, idx) => (
        <LeaderboardRow
          key={fd.friend_id}
          rank={idx + 1}
          username={fd.friend_username}
          description={fd.description_text ?? ''}
          votes={fd.vote_count ?? 0}
          isCurrentUser={false}
        />
      ))}
      {notPlayed.map((fd) => (
        <View key={fd.friend_id} style={[styles.notPlayedRow, { borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}>
            <Text style={styles.avatarText}>{fd.friend_avatar_url || '\uD83C\uDFAD'}</Text>
          </View>
          <Text style={[styles.notPlayedName, { color: colors.textMuted }]}>
            @{fd.friend_username} — {t('friends.hasnt_played')}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  lockText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  notPlayedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  notPlayedName: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
});
