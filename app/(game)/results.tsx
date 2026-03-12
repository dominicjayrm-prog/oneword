import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Modal,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../src/components/Toast';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useGameContext } from '../../src/contexts/GameContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { WordDisplay } from '../../src/components/WordDisplay';
import { LeaderboardRow } from '../../src/components/LeaderboardRow';
import { ShareCard } from '../../src/components/ShareCard';
import { Button } from '../../src/components/Button';
import { ThemeToggle } from '../../src/components/ThemeToggle';
import { FriendsLeaderboard } from '../../src/components/FriendsLeaderboard';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { ErrorState } from '../../src/components/ErrorState';
import { EmptyState } from '../../src/components/EmptyState';
import { RetryState } from '../../src/components/RetryState';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { fontSize, spacing, borderRadius } from '../../src/constants/theme';
import { haptic } from '../../src/lib/haptics';
import { useFavouritedIds } from '../../src/hooks/useFavourites';
import type { LeaderboardEntry } from '../../src/types/database';

export default function ResultsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profile } = useAuthContext();
  const { showToast } = useToast();
  const { todayWord, hasSubmitted, userDescription, getLeaderboard } = useGameContext();
  const { isOnline } = useNetwork();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [tab, setTab] = useState<'global' | 'friends'>('global');
  const { favouritedIds, checkFavourited, toggleLocal } = useFavouritedIds();

  const shareCardRef = useRef<View>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadResults = useCallback(async () => {
    setLoadError(false);
    try {
      const data = await getLeaderboard();
      setLeaderboard(data);
      if (data.length > 0) {
        checkFavourited(data.map((e) => e.description_id));
      }
    } catch (err) {
      console.warn('[ResultsScreen] Failed to load leaderboard:', err);
      setLoadError(true);
    }
    setLoading(false);
  }, [getLeaderboard, checkFavourited]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadResults();
    setRefreshing(false);
  }, [loadResults]);

  const myEntry = leaderboard.find((e) => e.username === profile?.username);

  // Haptic when user's rank appears
  useEffect(() => {
    if (myEntry && !loading) {
      haptic.success();
    }
  }, [myEntry?.rank, loading]);

  const handleSharePress = () => {
    haptic.medium();
    setShowPreview(true);
  };

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 960,
        height: 1200,
      });
      setShowPreview(false);
      await new Promise((r) => setTimeout(r, 300));
      if (!mountedRef.current) return;
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: t('results.share_dialog_title'),
        UTI: 'public.png',
      });
    } catch (err) {
      console.warn('[ResultsScreen] Share failed:', err);
      showToast(t('errors.share_failed'), 'error');
    } finally {
      setSharing(false);
    }
  };

  // Locked state — user hasn't submitted today's description yet
  if (!hasSubmitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemeToggle />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={styles.lockIcon}>{'\uD83D\uDD12'}</Text>
          {todayWord && <WordDisplay word={todayWord.word} category={todayWord.category} />}
          <Text style={[styles.lockedMessage, { color: colors.textSecondary }]}>{t('results.locked_message')}</Text>
        </View>
        <View style={styles.actions}>
          <Button
            title={t('results.go_to_today')}
            onPress={() => {
              haptic.medium();
              router.replace('/');
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemeToggle />
      {todayWord && <WordDisplay word={todayWord.word} category={todayWord.category} />}

      {/* Global / Friends toggle */}
      <View style={[styles.segmentedControl, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.segment, tab === 'global' && { backgroundColor: colors.primary }]}
          onPress={() => {
            haptic.light();
            setTab('global');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, { color: tab === 'global' ? '#FFFFFF' : colors.textMuted }]}>
            {'\uD83C\uDF0D'} {t('results_tabs.global')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, tab === 'friends' && { backgroundColor: colors.primary }]}
          onPress={() => {
            haptic.light();
            setTab('friends');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, { color: tab === 'friends' ? '#FFFFFF' : colors.textMuted }]}>
            {'\uD83D\uDC65'} {t('results_tabs.friends')}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'friends' ? (
        <FriendsLeaderboard />
      ) : loading ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <LoadingSpinner message={t('loading.results')} />
        </View>
      ) : loadError ? (
        <RetryState type={!isOnline ? 'offline' : 'error'} onRetry={loadResults} />
      ) : leaderboard.length === 0 ? (
        <EmptyState emoji={'\uD83D\uDDF3'} title={t('empty.no_results')} subtitle={t('empty.no_results_sub')} />
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.description_id}
          renderItem={({ item }) => (
            <LeaderboardRow
              rank={item.rank}
              username={item.username}
              description={item.description_text}
              votes={item.votes}
              isCurrentUser={item.username === profile?.username}
              badgeEmoji={item.streak_badge_emoji}
              descriptionId={item.description_id}
              isFavourited={favouritedIds.has(item.description_id)}
              onFavouriteToggle={(fav) => toggleLocal(item.description_id, fav)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}

      <View style={styles.actions}>
        {tab !== 'friends' && hasSubmitted && (
          <>
            <Button title={t('results.share_results')} onPress={handleSharePress} variant="primary" />
            <View style={{ height: spacing.sm }} />
          </>
        )}
      </View>

      {/* Share preview modal */}
      <Modal visible={showPreview} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('results.share_preview')}</Text>

            <View style={styles.cardWrapper}>
              <ShareCard
                ref={shareCardRef}
                word={todayWord?.word ?? '???'}
                description={userDescription}
                rank={myEntry?.rank ?? null}
                votes={myEntry?.votes ?? null}
                streak={profile?.current_streak ?? 0}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleShare}
                disabled={sharing}
                activeOpacity={0.8}
              >
                {sharing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalBtnText}>{t('results.share_btn')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowPreview(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t('results.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    padding: 3,
    marginBottom: spacing.lg,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  list: {
    paddingBottom: spacing.lg,
  },
  empty: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
  actions: {
    paddingBottom: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  cardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  cancelBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  lockedMessage: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
});
