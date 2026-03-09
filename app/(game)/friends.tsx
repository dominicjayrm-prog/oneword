import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
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
import { useToast } from '../../src/components/Toast';
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
import { fontSize, spacing } from '../../src/constants/theme';

export default function FriendsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session } = useAuthContext();
  const { todayWord, hasSubmitted } = useGameContext();

  const { showToast } = useToast();
  const userId = session?.user?.id;

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [descriptions, setDescriptions] = useState<FriendDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const processingRef = useRef(new Set<string>());

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(userId),
        getPendingRequests(userId),
      ]);
      setFriends(friendsData);
      setRequests(requestsData);

      if (todayWord?.id && friendsData.length > 0) {
        const descs = await getFriendsDescriptions(userId, todayWord.id);
        setDescriptions(descs);
      }
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }, [userId, todayWord?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  async function handleAccept(friendshipId: string) {
    if (processingRef.current.has(friendshipId)) return;
    processingRef.current.add(friendshipId);
    // Optimistic: remove from requests immediately
    setRequests((prev) => prev.filter((r) => r.friendship_id !== friendshipId));
    try {
      await acceptFriendRequest(friendshipId);
      showToast(t('success.friend_accepted'), 'success');
      // Reload to pick up the new friend in the friends list
      await loadData();
    } catch {
      showToast(t('errors.generic'), 'error');
      await loadData(); // reload to restore state
    } finally {
      processingRef.current.delete(friendshipId);
    }
  }

  async function handleDecline(friendshipId: string) {
    if (processingRef.current.has(friendshipId)) return;
    processingRef.current.add(friendshipId);
    // Optimistic: remove from requests immediately
    setRequests((prev) => prev.filter((r) => r.friendship_id !== friendshipId));
    try {
      await declineFriendRequest(friendshipId);
    } catch {
      showToast(t('errors.generic'), 'error');
      await loadData();
    } finally {
      processingRef.current.delete(friendshipId);
    }
  }

  async function handleRemove(friendshipId: string) {
    if (processingRef.current.has(friendshipId)) return;
    processingRef.current.add(friendshipId);
    // Optimistic: remove from list immediately
    setFriends((prev) => prev.filter((f) => f.friendship_id !== friendshipId));
    try {
      await removeFriend(friendshipId);
    } catch {
      showToast(t('errors.generic'), 'error');
      await loadData();
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
        <ErrorState
          title={t('errors.load_friends')}
          onRetry={loadData}
        />
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
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('friends.empty_title')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t('friends.empty_subtitle')}
          </Text>
          <View style={styles.emptyBtn}>
            <Button
              title={'+ ' + t('friends.add_friends')}
              onPress={() => setShowAddModal(true)}
            />
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
        <FriendRequests
          requests={requests}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />

        {/* Section 2: Today's word — friends' descriptions */}
        {todayWord && descriptions.length > 0 ? (
          <FriendsToday
            descriptions={descriptions}
            wordText={todayWord.word}
            userHasPlayed={hasSubmitted}
          />
        ) : todayWord && friends.length > 0 && (
          <View style={styles.noFriendsPlayed}>
            <Text style={[styles.noFriendsPlayedText, { color: colors.textMuted }]}>
              {t('empty.no_friends_played')}
            </Text>
          </View>
        )}

        {/* Section 3: All friends */}
        <FriendsList
          friends={friends}
          onRemove={handleRemove}
          onAddPress={() => setShowAddModal(true)}
        />
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
