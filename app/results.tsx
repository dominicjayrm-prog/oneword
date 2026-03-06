import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../src/contexts/AuthContext';
import { useGameContext } from '../src/contexts/GameContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { WordDisplay } from '../src/components/WordDisplay';
import { LeaderboardRow } from '../src/components/LeaderboardRow';
import { ShareCard } from '../src/components/ShareCard';
import { Button } from '../src/components/Button';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { fontSize, spacing, borderRadius } from '../src/constants/theme';
import type { LeaderboardEntry } from '../src/types/database';

export default function ResultsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profile } = useAuthContext();
  const { todayWord, userDescription, getLeaderboard } = useGameContext();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [sharing, setSharing] = useState(false);

  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    async function load() {
      const data = await getLeaderboard();
      setLeaderboard(data);
      setLoading(false);
    }
    load();
  }, []);

  const myEntry = leaderboard.find((e) => e.username === profile?.username);

  const handleSharePress = () => {
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
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your OneWord result',
        UTI: 'public.png',
      });
    } catch {
      // user cancelled or error
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemeToggle />
      {todayWord && <WordDisplay word={todayWord.word} category={todayWord.category} />}
      <Text style={[styles.title, { color: colors.textMuted }]}>{t('results.leaderboard')}</Text>

      {loading ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : leaderboard.length === 0 ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={[styles.empty, { color: colors.text }]}>{t('results.no_results')}</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{t('results.no_results_sub')}</Text>
        </View>
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
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.actions}>
        <Button title={t('results.share_results')} onPress={handleSharePress} variant="primary" />
        <View style={{ height: spacing.sm }} />
        <Button title={t('results.back_home')} onPress={() => router.replace('/')} variant="outline" />
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
  title: {
    fontSize: fontSize.xs,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
});
