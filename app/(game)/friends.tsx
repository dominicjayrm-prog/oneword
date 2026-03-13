import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useGameContext } from '../../src/contexts/GameContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { ThemeToggle } from '../../src/components/ThemeToggle';
import { Button } from '../../src/components/Button';
import { FriendRequests } from '../../src/components/FriendRequests';
import { FriendsToday } from '../../src/components/FriendsToday';
import { FriendsList } from '../../src/components/FriendsList';
import { AddFriendModal } from '../../src/components/AddFriendModal';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { ErrorState } from '../../src/components/ErrorState';
import { RetryState } from '../../src/components/RetryState';
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
import { fontSize, spacing } from '../../src/constants/theme';

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

    const friendsWhoPlayed = descriptions.filter((d) => d.has_played).map((d) => d.friend_username);
    if (friendsWhoPlayed.length === 0) return;

    const gameDate = getGameDate();
    const storageKey = `@oneword_friend_activity_notified_${gameDate}`;

    (async () => {
      try {
        const already = await AsyncStorage.getItem(storageKey);
        if (already) {
          // Check if there are new friends who played since last notification
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
    // Capture the removed item for rollback using functional updates
    let removedRequest: PendingRequest | undefined;
    setRequests((prev) => {
      removedRequest = prev.find((r) => r.friendship_id === friendshipId);
      return prev.filter((r) => r.friendship_id !== friendshipId);
    });
    try {
      const { error } = await acceptFriendRequest(friendshipId, userId!);
      if (error) {
        showToast(t('errors.generic'), 'error');
        if (removedRequest) {
          setRequests((prev) => [...prev, removedRequest!]);
        }
      } else {
        showToast(t('success.friend_accepted'), 'success');
      }
      await loadData(false);
    } catch {
      showToast(t('errors.generic'), 'error');
      if (removedRequest) {
        setRequests((prev) => [...prev, removedRequest!]);
      }
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
        if (removedRequest) {
          setRequests((prev) => [...prev, removedRequest!]);
        }
      }
    } catch {
      showToast(t('errors.generic'), 'error');
      if (removedRequest) {
        setRequests((prev) => [...prev, removedRequest!]);
      }
    } finally {
      processingRef.current.delete(friendshipId);
    }
  }

  async function handleRemove(friendshipId: string) {
    if (processingRef.current.has(friendshipId)) return;
    processingRef.current.add(friendshipId);
    // Capture removed items for rollback using functional updates
    let removedFriend: Friend | undefined;
    let removedDescs: FriendDescription[] = [];
    setFriends((prev) => {
      removedFriend = prev.find((f) => f.friendship_id === friendshipId);
      return prev.filter((f) => f.friendship_id !== friendshipId);
    });
    // Also remove from descriptions so FriendsToday updates immediately
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
        <ThemeToggle />
        <RetryState type={!isOnline ? 'offline' : 'error'} onRetry={loadData} />
      </View>
    );
  }

  // Empty state — no friends at all
  if (friends.length === 0 && requests.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemeToggle />
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
      <ThemeToggle />
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
        {/* Section 1: Friend Requests */}
        <FriendRequests requests={requests} onAccept={handleAccept} onDecline={handleDecline} />

        {/* Section 2: Today's word — friends' descriptions */}
        {todayWord && descriptions.length > 0 ? (
          <FriendsToday
            descriptions={descriptions}
            wordText={todayWord.word}
            userHasPlayed={hasSubmitted}
            favouritedIds={favouritedIds}
            onFavouriteToggle={toggleLocal}
          />
        ) : (
          todayWord &&
          friends.length > 0 && (
            <View style={styles.noFriendsPlayed}>
              <Text style={[styles.noFriendsPlayedText, { color: colors.textMuted }]}>
                {t('empty.no_friends_played')}
              </Text>
            </View>
          )
        )}

        {/* Section 3: All friends */}
        <FriendsList friends={friends} onRemove={handleRemove} onAddPress={() => setShowAddModal(true)} />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    width: '100%',
    maxWidth: 280,
  },
  noFriendsPlayed: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  noFriendsPlayedText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
