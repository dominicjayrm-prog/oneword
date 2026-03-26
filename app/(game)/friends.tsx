import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useGameContext } from '../../src/contexts/GameContext';
import { useTheme } from '../../src/contexts/ThemeContext';

import { Button } from '../../src/components/Button';
import { FriendRequests } from '../../src/components/FriendRequests';
import { AddFriendModal } from '../../src/components/AddFriendModal';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { RetryState } from '../../src/components/RetryState';
import { FavouriteButton } from '../../src/components/FavouriteButton';
import { useToast } from '../../src/components/Toast';
import { useNetwork } from '../../src/contexts/NetworkContext';
import {
  getFriends,
  getPendingRequests,
  getFriendsDescriptions,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  type Friend,
  type PendingRequest,
  type FriendDescription,
} from '../../src/lib/friends';
import { useFavouritedIds } from '../../src/hooks/useFavourites';
import { haptic } from '../../src/lib/haptics';
import { triggerFriendActivityNotification } from '../../src/lib/notifications';
import { getGameDate } from '../../src/lib/gameDate';
import { getCurrentBadge } from '../../src/lib/badges';
import { formatDescription } from '../../src/lib/format';
import { withOpacity } from '../../src/constants/theme';

export default function FriendsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session, profile } = useAuthContext();
  const { todayWord, hasSubmitted } = useGameContext();

  const { showToast } = useToast();
  const { isOnline } = useNetwork();
  const userId = session?.user?.id;

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [descriptions, setDescriptions] = useState<FriendDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const processingRef = useRef(new Set<string>());
  const { favouritedIds, checkFavourited, toggleLocal } = useFavouritedIds();

  const loadData = useCallback(
    async (showFullLoading = true) => {
      if (!userId) return;
      if (showFullLoading) setLoading(true);
      setLoadError(false);
      try {
        const [friendsData, requestsData] = await Promise.all([getFriends(userId), getPendingRequests(userId)]);
        setFriends(friendsData);
        setRequests(requestsData);

        if (todayWord?.id && friendsData.length > 0) {
          const descs = await getFriendsDescriptions(userId, todayWord.id);
          setDescriptions(descs);
          const descIds = descs.map((d) => d.description_id).filter(Boolean) as string[];
          if (descIds.length > 0) checkFavourited(descIds);
        }
      } catch (err) {
        console.warn('[FriendsScreen] Failed to load data:', err);
        setLoadError(true);
      }
      if (showFullLoading) setLoading(false);
    },
    [userId, todayWord?.id, checkFavourited],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fire local notification for new friend activity (once per game day)
  useEffect(() => {
    if (Platform.OS === 'web' || !profile?.notify_friend_activity) return;
    if (descriptions.length === 0 || loading) return;

    const friendsWhoPlayed = descriptions
      .filter((d) => d.has_played && d.description_text)
      .map((d) => d.friend_username);
    if (friendsWhoPlayed.length === 0) return;

    const gameDate = getGameDate();
    const storageKey = `@oneword_friend_activity_notified_${gameDate}`;

    (async () => {
      try {
        const already = await AsyncStorage.getItem(storageKey);
        if (already) {
          const prevNotified: string[] = JSON.parse(already);
          const newPlayers = friendsWhoPlayed.filter((u) => !prevNotified.includes(u));
          if (newPlayers.length === 0) return;
          await triggerFriendActivityNotification(newPlayers);
          await AsyncStorage.setItem(storageKey, JSON.stringify([...prevNotified, ...newPlayers]));
        } else {
          await triggerFriendActivityNotification(friendsWhoPlayed);
          await AsyncStorage.setItem(storageKey, JSON.stringify(friendsWhoPlayed));
        }
      } catch {
        // non-critical
      }
    })();
  }, [descriptions, loading, profile?.notify_friend_activity]);

  const handleRefresh = useCallback(async () => {
    haptic.medium();
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  }, [loadData]);

  async function handleAccept(friendshipId: string) {
    if (processingRef.current.has(friendshipId)) return;
    processingRef.current.add(friendshipId);
    let removedRequest: PendingRequest | undefined;
    setRequests((prev) => {
      removedRequest = prev.find((r) => r.friendship_id === friendshipId);
      return prev.filter((r) => r.friendship_id !== friendshipId);
    });
    try {
      const { error } = await acceptFriendRequest(friendshipId, userId!);
      if (error) {
        showToast(t('errors.generic'), 'error');
        if (removedRequest) setRequests((prev) => [...prev, removedRequest!]);
      } else {
        showToast(t('success.friend_accepted'), 'success');
      }
      await loadData(false);
    } catch {
      showToast(t('errors.generic'), 'error');
      if (removedRequest) setRequests((prev) => [...prev, removedRequest!]);
    } finally {
      processingRef.current.delete(friendshipId);
    }
  }

  async function handleDecline(friendshipId: string) {
    if (processingRef.current.has(friendshipId)) return;
    processingRef.current.add(friendshipId);
    let removedRequest: PendingRequest | undefined;
    setRequests((prev) => {
      removedRequest = prev.find((r) => r.friendship_id === friendshipId);
      return prev.filter((r) => r.friendship_id !== friendshipId);
    });
    try {
      const { error } = await declineFriendRequest(friendshipId, userId!);
      if (error) {
        showToast(t('errors.generic'), 'error');
        if (removedRequest) setRequests((prev) => [...prev, removedRequest!]);
      }
    } catch {
      showToast(t('errors.generic'), 'error');
      if (removedRequest) setRequests((prev) => [...prev, removedRequest!]);
    } finally {
      processingRef.current.delete(friendshipId);
    }
  }

  async function handleRemove(friendshipId: string) {
    if (processingRef.current.has(friendshipId)) return;
    processingRef.current.add(friendshipId);
    let removedFriend: Friend | undefined;
    let removedDescs: FriendDescription[] = [];
    setFriends((prev) => {
      removedFriend = prev.find((f) => f.friendship_id === friendshipId);
      return prev.filter((f) => f.friendship_id !== friendshipId);
    });
    if (removedFriend) {
      const friendId = removedFriend.friend_id;
      setDescriptions((prev) => {
        removedDescs = prev.filter((d) => d.friend_id === friendId);
        return prev.filter((d) => d.friend_id !== friendId);
      });
    }
    try {
      const { error } = await removeFriend(friendshipId, userId!);
      if (error) {
        showToast(t('errors.generic'), 'error');
        if (removedFriend) setFriends((prev) => [...prev, removedFriend!]);
        if (removedDescs.length > 0) setDescriptions((prev) => [...prev, ...removedDescs]);
      }
    } catch {
      showToast(t('errors.generic'), 'error');
      if (removedFriend) setFriends((prev) => [...prev, removedFriend!]);
      if (removedDescs.length > 0) setDescriptions((prev) => [...prev, ...removedDescs]);
    } finally {
      processingRef.current.delete(friendshipId);
    }
  }

  function confirmRemove(friend: Friend) {
    haptic.warning();
    if (Platform.OS === 'web') {
      if (window.confirm(t('friends.remove_confirm'))) {
        handleRemove(friend.friendship_id);
      }
    } else {
      Alert.alert(t('friends.remove_confirm_title'), t('friends.remove_confirm'), [
        { text: t('friends.decline'), style: 'cancel' },
        { text: t('friends.remove'), style: 'destructive', onPress: () => handleRemove(friend.friendship_id) },
      ]);
    }
  }

  // Build unified friend card data by merging friends + descriptions
  const unifiedFriends = useMemo(() => {
    return friends.map((f) => {
      const desc = descriptions.find((d) => d.friend_id === f.friend_id);
      // Only count as "played" if they actually have a description text
      const actuallyPlayed = (desc?.has_played ?? false) && !!desc?.description_text;
      return {
        ...f,
        has_played: actuallyPlayed,
        description_text: desc?.description_text ?? null,
        description_id: desc?.description_id ?? null,
        vote_count: desc?.vote_count ?? null,
        elo_rating: desc?.elo_rating ?? null,
        today_rank: null as number | null,
      };
    });
  }, [friends, descriptions]);

  // Sort: played first (by elo desc), then not played (alphabetically)
  const sortedFriends = useMemo(() => {
    const played = unifiedFriends
      .filter((f) => f.has_played)
      .sort((a, b) => (b.elo_rating ?? 0) - (a.elo_rating ?? 0))
      .map((f, i) => ({ ...f, today_rank: i + 1 }));
    const notPlayed = unifiedFriends
      .filter((f) => !f.has_played)
      .sort((a, b) => a.friend_username.localeCompare(b.friend_username));
    return [...played, ...notPlayed];
  }, [unifiedFriends]);

  const playedCount = sortedFriends.filter((f) => f.has_played).length;

  // Streak leaderboard: all friends + current user, sorted by streak
  const streakLeaderboard = useMemo(() => {
    const entries: Array<{
      id: string;
      username: string;
      avatar: string | null;
      streak: number;
      isYou: boolean;
    }> = friends.map((f) => ({
      id: f.friend_id,
      username: f.friend_username,
      avatar: f.friend_avatar_url,
      streak: f.friend_current_streak,
      isYou: false,
    }));

    // Add current user
    if (profile) {
      entries.push({
        id: profile.id,
        username: profile.username,
        avatar: profile.avatar_url,
        streak: profile.current_streak,
        isYou: true,
      });
    }

    return entries.sort((a, b) => b.streak - a.streak);
  }, [friends, profile]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <LoadingSpinner message={t('loading.generic')} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <RetryState type={!isOnline ? 'offline' : 'error'} onRetry={loadData} />
      </View>
    );
  }

  // Empty state
  if (friends.length === 0 && requests.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{'\uD83D\uDC65'}</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('friends.empty_title')}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{t('friends.empty_subtitle')}</Text>
          <View style={styles.emptyBtn}>
            <Button title={'+ ' + t('friends.add_friends')} onPress={() => setShowAddModal(true)} />
          </View>
        </View>
        {userId && (
          <AddFriendModal
            visible={showAddModal}
            onClose={() => setShowAddModal(false)}
            currentUserId={userId}
            onRequestSent={loadData}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('friends.tab_title')}</Text>
            <Text style={styles.headerSubtitle}>
              {friends.length === 1
                ? t('friends.friend_count_one')
                : t('friends.friend_count', { count: friends.length })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addPill, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addPillText}>+ {t('friends.add')}</Text>
          </TouchableOpacity>
        </View>

        {/* Friend Requests */}
        <FriendRequests requests={requests} onAccept={handleAccept} onDecline={handleDecline} />

        {/* Today's Word Hero Card */}
        {todayWord && (
          <View style={styles.heroCard}>
            <View style={styles.heroOverflow}>
              <Text style={styles.heroWatermark}>{todayWord.word}</Text>
            </View>
            <Text style={styles.heroLabel}>{t('friends.today_word')}</Text>
            <Text style={styles.heroWord}>{todayWord.word}</Text>
            <Text style={styles.heroSubtitle}>{t('friends.today_title')}</Text>
          </View>
        )}

        {/* Lock banner if user hasn't played */}
        {todayWord && !hasSubmitted && (
          <View
            style={[
              styles.lockBanner,
              { backgroundColor: withOpacity(colors.primary, 0.06), borderColor: withOpacity(colors.primary, 0.19) },
            ]}
          >
            <Text style={[styles.lockText, { color: colors.primary }]}>{t('friends.play_first')}</Text>
          </View>
        )}

        {/* Played Today Section Divider */}
        {friends.length > 0 && (
          <View style={styles.sectionDivider}>
            <Text style={styles.sectionLabel}>{t('friends.played_today')}</Text>
            <View style={[styles.sectionLine, { backgroundColor: withOpacity(colors.textMuted, 0.2) }]} />
            <Text style={[styles.sectionCount, { color: colors.primary }]}>
              {t('friends.played_count', { played: playedCount, total: friends.length })}
            </Text>
          </View>
        )}

        {/* Unified Friend Cards */}
        <View style={styles.friendCards}>
          {sortedFriends.map((friend) => {
            const played = friend.has_played;
            const badge = getCurrentBadge(friend.friend_current_streak);
            const streakText = friend.friend_current_streak > 0 ? `${friend.friend_current_streak}d` : null;
            const isHighStreak = friend.friend_current_streak >= 7;

            return (
              <TouchableOpacity
                key={friend.friendship_id}
                style={[
                  styles.friendCard,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: 'rgba(26,26,46,0.08)',
                    opacity: played ? 1 : 0.65,
                  },
                ]}
                onLongPress={() => confirmRemove(friend)}
                activeOpacity={0.7}
              >
                {/* Top row: avatar, name, streak, rank */}
                <View style={styles.cardTopRow}>
                  <View style={styles.cardLeft}>
                    <View
                      style={[
                        styles.cardAvatar,
                        {
                          backgroundColor: played ? withOpacity(colors.primary, 0.15) : 'rgba(139,134,151,0.15)',
                        },
                      ]}
                    >
                      <Text style={styles.cardAvatarText}>{friend.friend_avatar_url || '\uD83C\uDFAD'}</Text>
                    </View>
                    <Text style={[styles.cardUsername, { color: '#1A1A2E' }]}>@{friend.friend_username}</Text>
                    {streakText && (
                      <View
                        style={[
                          styles.streakPill,
                          {
                            backgroundColor: isHighStreak ? colors.primary : 'rgba(139,134,151,0.15)',
                          },
                        ]}
                      >
                        <Text style={[styles.streakPillText, { color: isHighStreak ? '#FFFFFF' : '#8B8697' }]}>
                          {streakText}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardRight}>
                    {played && friend.today_rank ? (
                      <Text style={styles.cardRank}>{t('friends.ranked_today', { rank: friend.today_rank })}</Text>
                    ) : !played ? (
                      <View style={styles.greyDot} />
                    ) : null}
                  </View>
                </View>

                {/* Description or "hasn't played" */}
                {played && friend.description_text && hasSubmitted ? (
                  <View style={styles.quoteBlock}>
                    <View style={styles.quoteContent}>
                      <Text style={styles.quoteText}>
                        {'\u201C'}
                        {formatDescription(friend.description_text)}
                        {'\u201D'}
                      </Text>
                    </View>
                    {friend.description_id && (
                      <FavouriteButton
                        descriptionId={friend.description_id}
                        isFavourited={favouritedIds?.has(friend.description_id) ?? false}
                        onToggle={(fav) => toggleLocal(friend.description_id!, fav)}
                        size={13}
                      />
                    )}
                  </View>
                ) : played && !hasSubmitted ? (
                  <Text style={styles.lockedText}>
                    {'\uD83D\uDD12'} {t('friends.locked')}
                  </Text>
                ) : (
                  <Text style={styles.hasntPlayed}>{t('friends.hasnt_played')}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Streak Leaderboard */}
        {streakLeaderboard.length > 0 && streakLeaderboard.some((e) => e.streak > 0) && (
          <>
            <View style={[styles.sectionDivider, { marginTop: 8 }]}>
              <Text style={styles.sectionLabel}>{t('friends.streak_leaderboard')}</Text>
              <View style={[styles.sectionLine, { backgroundColor: withOpacity(colors.textMuted, 0.2) }]} />
            </View>

            <View style={styles.streakList}>
              {streakLeaderboard
                .filter((e) => e.streak > 0)
                .map((entry, i) => {
                  const isFirst = i === 0;
                  const badge = getCurrentBadge(entry.streak);
                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.streakRow,
                        {
                          backgroundColor: entry.isYou ? withOpacity(colors.primary, 0.06) : '#FFFFFF',
                          borderColor: entry.isYou ? withOpacity(colors.primary, 0.15) : 'rgba(26,26,46,0.08)',
                        },
                      ]}
                    >
                      <Text style={[styles.streakRank, { color: isFirst ? colors.primary : '#8B8697' }]}>#{i + 1}</Text>
                      <Text style={styles.streakEmoji}>{entry.avatar || '\uD83C\uDFAD'}</Text>
                      <Text style={[styles.streakUsername, { color: '#1A1A2E' }]}>
                        {entry.isYou ? `@${entry.username}` : `@${entry.username}`}
                      </Text>
                      {entry.isYou && (
                        <View style={[styles.youBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.youBadgeText}>{t('friends.you_label')}</Text>
                        </View>
                      )}
                      <View style={styles.streakRight}>
                        <Text
                          style={[
                            styles.streakNumber,
                            {
                              color: isFirst ? colors.primary : '#1A1A2E',
                              fontWeight: isFirst ? '600' : '500',
                            },
                          ]}
                        >
                          {'\uD83D\uDD25'} {entry.streak}
                        </Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          </>
        )}
      </ScrollView>

      {userId && (
        <AddFriendModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          currentUserId={userId}
          onRequestSent={loadData}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontWeight: '900',
    color: '#1A1A2E',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8B8697',
    marginTop: 2,
  },
  addPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    marginTop: 4,
  },
  addPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Hero Card
  heroCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    backgroundColor: '#1A1A2E',
    overflow: 'hidden',
  },
  heroOverflow: {
    position: 'absolute',
    top: -10,
    right: -20,
    transform: [{ rotate: '12deg' }],
  },
  heroWatermark: {
    fontSize: 80,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontWeight: '900',
    color: 'rgba(255,255,255,0.08)',
  },
  heroLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginBottom: 8,
  },
  heroWord: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },

  // Lock banner
  lockBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  lockText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Section Divider
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1,
    color: '#8B8697',
    fontWeight: '500',
  },
  sectionLine: {
    flex: 1,
    height: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Friend Cards
  friendCards: {
    gap: 8,
    marginBottom: 8,
  },
  friendCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    paddingHorizontal: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  cardAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: {
    fontSize: 20,
  },
  cardUsername: {
    fontSize: 15,
    fontWeight: '600',
  },
  streakPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  streakPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardRank: {
    fontSize: 12,
    color: '#8B8697',
  },
  greyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(139,134,151,0.3)',
  },

  // Quote block
  quoteBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#FFFDF7',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B4A',
  },
  quoteContent: {
    flex: 1,
  },
  quoteText: {
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    color: '#1A1A2E',
    fontFamily: 'DMSans_500Medium',
  },
  lockedText: {
    fontSize: 12,
    color: '#8B8697',
    marginTop: 8,
  },
  hasntPlayed: {
    fontSize: 12,
    color: '#8B8697',
    marginTop: 6,
  },

  // Streak Leaderboard
  streakList: {
    gap: 6,
    marginBottom: 8,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  streakRank: {
    fontSize: 14,
    fontWeight: '700',
    width: 28,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakUsername: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  streakRight: {
    alignItems: 'flex-end',
  },
  streakNumber: {
    fontSize: 14,
    fontFamily: 'DMMono_400Regular',
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyBtn: {
    width: '100%',
    maxWidth: 280,
  },
});
