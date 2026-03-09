import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useGameContext } from '../../src/contexts/GameContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { WordDisplay } from '../../src/components/WordDisplay';
import { Button } from '../../src/components/Button';
import { ThemeToggle } from '../../src/components/ThemeToggle';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { EmptyState } from '../../src/components/EmptyState';
import { useToast } from '../../src/components/Toast';
import { VOTE_BATCH_SIZE } from '../../src/constants/app';
import { fontSize, spacing, borderRadius } from '../../src/constants/theme';
import { haptic } from '../../src/lib/haptics';
import type { VotePair } from '../../src/types/database';

export default function VoteScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session } = useAuthContext();
  const { todayWord, getVotePair, submitVote, reportDescription } = useGameContext();

  const { showToast } = useToast();

  const [pair, setPair] = useState<VotePair | null>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [noMorePairs, setNoMorePairs] = useState(false);
  const [voting, setVoting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedCard, setSelectedCard] = useState<1 | 2 | null>(null);
  // How many pairs we've shown this session (caps at VOTE_BATCH_SIZE per visit)
  const pairsShownRef = useRef(0);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Animation shared values
  const card1TranslateX = useSharedValue(-300);
  const card1Opacity = useSharedValue(0);
  const card1Scale = useSharedValue(1);
  const card2TranslateX = useSharedValue(300);
  const card2Opacity = useSharedValue(0);
  const card2Scale = useSharedValue(1);
  const vsOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0);
  const voteCountScale = useSharedValue(1);

  // Done screen animations
  const doneEmojiScale = useSharedValue(0);
  const doneTextOpacity = useSharedValue(0);

  const animatePairIn = useCallback(() => {
    'worklet';
    card1TranslateX.value = -300;
    card1Opacity.value = 0;
    card1Scale.value = 1;
    card2TranslateX.value = 300;
    card2Opacity.value = 0;
    card2Scale.value = 1;
    vsOpacity.value = 0;
    badgeScale.value = 0;

    card1TranslateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    card1Opacity.value = withTiming(1, { duration: 300 });

    card2TranslateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    card2Opacity.value = withTiming(1, { duration: 300 });

    vsOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));
  }, []);

  const loadPair = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setSelectedCard(null);
    try {
      const p = await getVotePair();
      if (!p) {
        setNoMorePairs(true);
      } else {
        pairsShownRef.current += 1;
      }
      setPair(p);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }, [getVotePair]);

  // Animate pair in when pair changes and loading finishes
  useEffect(() => {
    if (pair && !loading) {
      animatePairIn();
      haptic.light();
    }
  }, [pair, loading, animatePairIn]);

  // Animate vote count bump
  useEffect(() => {
    if (voteCount > 0) {
      voteCountScale.value = withSequence(
        withTiming(1.15, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
    }
  }, [voteCount]);

  useEffect(() => {
    loadPair();
  }, [loadPair]);

  async function handleVote(winnerId: string, loserId: string, winnerIsCard1: boolean) {
    if (voting) return;
    haptic.medium();
    setVoting(true);
    setSelectedCard(winnerIsCard1 ? 1 : 2);

    const winnerScale = winnerIsCard1 ? card1Scale : card2Scale;
    const loserScale = winnerIsCard1 ? card2Scale : card1Scale;
    const loserOpacity = winnerIsCard1 ? card2Opacity : card1Opacity;

    // Winner pops up
    winnerScale.value = withSpring(1.04, { damping: 10, stiffness: 200 });
    // Loser shrinks and fades
    loserScale.value = withTiming(0.96, { duration: 300 });
    loserOpacity.value = withTiming(0.3, { duration: 300 });
    // Badge springs in
    badgeScale.value = withSpring(1, { damping: 8, stiffness: 200 });

    const newCount = voteCount + 1;
    setVoteCount(newCount);

    // Submit vote
    try {
      const { error } = await submitVote(winnerId, loserId);
      if (error) {
        showToast(t('errors.vote_failed'), 'error');
      }
    } catch {
      showToast(t('errors.vote_failed'), 'error');
    }

    // Wait for visual feedback
    await new Promise((r) => setTimeout(r, 600));
    if (!mountedRef.current) return;

    // Slide out
    if (winnerIsCard1) {
      card1TranslateX.value = withTiming(300, { duration: 250 });
      card1Opacity.value = withTiming(0, { duration: 250 });
    } else {
      card2TranslateX.value = withTiming(300, { duration: 250 });
      card2Opacity.value = withTiming(0, { duration: 250 });
    }
    const otherOpacity = winnerIsCard1 ? card2Opacity : card1Opacity;
    otherOpacity.value = withTiming(0, { duration: 200 });
    vsOpacity.value = withTiming(0, { duration: 200 });

    await new Promise((r) => setTimeout(r, 300));
    if (!mountedRef.current) return;

    // After VOTE_BATCH_SIZE pairs this session, take a break.
    // User can revisit the tab later when new descriptions come in.
    if (pairsShownRef.current >= VOTE_BATCH_SIZE) {
      haptic.success();
      setNoMorePairs(true);
    } else {
      await loadPair();
    }

    setVoting(false);
    setSelectedCard(null);
  }

  async function handleReport(descriptionId: string) {
    const ok = Platform.OS === 'web'
      ? window.confirm(`${t('vote.report_title')}\n\n${t('vote.report_message')}`)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(t('vote.report_title'), t('vote.report_message'), [
            { text: t('vote.report_cancel'), style: 'cancel', onPress: () => resolve(false) },
            { text: t('vote.report_confirm'), style: 'destructive', onPress: () => resolve(true) },
          ]);
        });

    if (ok) {
      await reportDescription(descriptionId);
      if (Platform.OS === 'web') {
        window.alert(t('vote.reported_message'));
      } else {
        Alert.alert(t('vote.reported'), t('vote.reported_message'));
      }
      loadPair();
    }
  }

  // Animated styles
  const card1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: card1TranslateX.value },
      { scale: card1Scale.value },
    ],
    opacity: card1Opacity.value,
  }));

  const card2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: card2TranslateX.value },
      { scale: card2Scale.value },
    ],
    opacity: card2Opacity.value,
  }));

  const vsStyle = useAnimatedStyle(() => ({
    opacity: vsOpacity.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeScale.value,
  }));

  const voteCountAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: voteCountScale.value }],
  }));

  const doneEmojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: doneEmojiScale.value }],
  }));

  const doneTextStyle = useAnimatedStyle(() => ({
    opacity: doneTextOpacity.value,
  }));

  // "All caught up" or "no pairs yet" screen
  if (noMorePairs) {
    if (voteCount === 0) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ThemeToggle />
          <EmptyState
            emoji={'\uD83D\uDCDD'}
            title={t('vote.no_pairs')}
            subtitle={t('vote.all_caught_up_subtitle')}
            actionLabel={t('vote.back_home')}
            onAction={() => router.replace('/')}
          />
        </View>
      );
    }

    // Trigger done animation
    doneEmojiScale.value = withSpring(1, { damping: 8, stiffness: 150 });
    doneTextOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));

    const votedText = voteCount === 1
      ? t('vote.voted_on', { count: voteCount })
      : t('vote.voted_on_plural', { count: voteCount });
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemeToggle />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Animated.Text style={[styles.doneEmoji, doneEmojiStyle]}>{'\u2705'}</Animated.Text>
          <Animated.View style={doneTextStyle}>
            <Text style={[styles.doneTitle, { color: colors.text }]}>
              {t('vote.all_caught_up')}
            </Text>
            <Text style={[styles.doneSubtitle, { color: colors.textSecondary }]}>
              {votedText}
            </Text>
            <Text style={[styles.doneHint, { color: colors.textMuted }]}>
              {t('vote.all_caught_up_subtitle')}
            </Text>
          </Animated.View>
        </View>
        <View style={styles.actions}>
          <Button title={t('vote.see_results')} onPress={() => { haptic.medium(); router.replace('/results'); }} />
          <Button title={t('vote.back_home')} onPress={() => { haptic.medium(); router.replace('/'); }} variant="outline" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemeToggle />
      <View style={styles.header}>
        {todayWord && <WordDisplay word={todayWord.word} category={todayWord.category} />}

        {/* Vote count — informational only, not a cap */}
        {voteCount > 0 && (
          <View style={styles.progressRow}>
            <Animated.Text style={[styles.progress, { color: colors.textSecondary }, voteCountAnimStyle]}>
              {t('vote.pair_count', { current: voteCount, total: pairsShownRef.current })}
            </Animated.Text>
          </View>
        )}

        <Text style={[styles.instruction, { color: colors.textMuted }]}>{t('vote.tap_prefer')}</Text>
      </View>

      <View style={styles.pairContainer}>
        {loading ? (
          <LoadingSpinner />
        ) : loadError ? (
          <View style={styles.noPairs}>
            <Text style={[styles.doneTitle, { color: colors.text }]}>{t('errors.generic')}</Text>
            <Button title={t('errors.try_again')} onPress={loadPair} variant="outline" />
          </View>
        ) : !pair ? (
          <View style={styles.noPairs}>
            <Text style={[styles.doneTitle, { color: colors.text }]}>{t('vote.no_pairs')}</Text>
            <Button title={t('vote.back_home')} onPress={() => router.replace('/')} variant="outline" />
          </View>
        ) : (
          <>
            {/* Card 1 */}
            <View>
              <Animated.View style={card1Style}>
                <TouchableOpacity
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: selectedCard === 1 ? colors.primary : colors.border },
                    selectedCard === 1 && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => handleVote(pair.desc1_id, pair.desc2_id, true)}
                  activeOpacity={0.85}
                  disabled={voting}
                >
                  <Text style={[styles.cardText, { color: colors.text }]}>{pair.desc1_text}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={() => handleReport(pair.desc1_id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.reportText, { color: colors.textMuted }]}>{t('vote.report')}</Text>
                </TouchableOpacity>
              </Animated.View>
              {selectedCard === 1 && (
                <Animated.View style={[styles.pickBadge, { backgroundColor: colors.primary }, badgeStyle]}>
                  <Text style={styles.pickBadgeText}>{t('vote.your_pick')}</Text>
                </Animated.View>
              )}
            </View>

            <Animated.Text style={[styles.vs, { color: colors.textMuted }, vsStyle]}>VS</Animated.Text>

            {/* Card 2 */}
            <View>
              <Animated.View style={card2Style}>
                <TouchableOpacity
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: selectedCard === 2 ? colors.primary : colors.border },
                    selectedCard === 2 && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => handleVote(pair.desc2_id, pair.desc1_id, false)}
                  activeOpacity={0.85}
                  disabled={voting}
                >
                  <Text style={[styles.cardText, { color: colors.text }]}>{pair.desc2_text}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={() => handleReport(pair.desc2_id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.reportText, { color: colors.textMuted }]}>{t('vote.report')}</Text>
                </TouchableOpacity>
              </Animated.View>
              {selectedCard === 2 && (
                <Animated.View style={[styles.pickBadge, { backgroundColor: colors.primary }, badgeStyle]}>
                  <Text style={styles.pickBadgeText}>{t('vote.your_pick')}</Text>
                </Animated.View>
              )}
            </View>
          </>
        )}
      </View>
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
  header: {
    alignItems: 'center',
  },
  progressRow: {
    marginTop: spacing.sm,
  },
  progress: {
    fontSize: fontSize.sm,
  },
  instruction: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  pairContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: '500',
  },
  reportButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: 4,
  },
  reportText: {
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  pickBadge: {
    position: 'absolute',
    top: -10,
    right: -4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pickBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  vs: {
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 4,
  },
  noPairs: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  doneEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  doneTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  doneSubtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  doneHint: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});
