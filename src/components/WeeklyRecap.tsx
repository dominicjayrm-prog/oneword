import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Button } from './Button';
import { WeeklyRecapShareCard } from './WeeklyRecapShareCard';
import { getRankEmoji } from '../lib/format';
import { fontSize, spacing, borderRadius } from '../constants/theme';
import { haptic } from '../lib/haptics';
import type { WeeklyRecap as WeeklyRecapType } from '../types/database';

interface Props {
  data: WeeklyRecapType;
  onDismiss: () => void;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString(undefined, opts)} - ${e.toLocaleDateString(undefined, opts)}`;
}

/** Build array of 7 booleans (Mon-Sun) for which days user played */
function getDayCircles(daysPlayed: number): boolean[] {
  // We don't know which specific days — just fill left to right
  const circles: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    circles.push(i < daysPlayed);
  }
  return circles;
}

export function WeeklyRecapCard({ data, onDismiss }: Props) {
  const { t } = useTranslation();
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<View>(null);

  const dateRange = formatDateRange(data.week_start, data.week_end);
  const dayCircles = getDayCircles(data.days_played);

  const rankEmoji = getRankEmoji(data.best_rank);
  const improved = data.previous_week_average_rank != null && data.average_rank != null && data.average_rank < data.previous_week_average_rank;

  // ── Animations ──
  const bgOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(-15);
  const dateOpacity = useSharedValue(0);
  const bestCardTranslateY = useSharedValue(40);
  const bestCardOpacity = useSharedValue(0);
  const bestWordOpacity = useSharedValue(0);
  const bestDescOpacity = useSharedValue(0);
  const bestRankScale = useSharedValue(0);
  const daysOpacity = useSharedValue(0);
  const statsOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const perfectScale = useSharedValue(0);

  useEffect(() => {
    // Staggered entrance (~2.5s total)
    bgOpacity.value = withTiming(1, { duration: 300 });
    titleOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));
    titleTranslateY.value = withDelay(100, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
    dateOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    bestCardTranslateY.value = withDelay(400, withSpring(0, { damping: 14, stiffness: 120 }));
    bestCardOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    bestWordOpacity.value = withDelay(600, withTiming(1, { duration: 250 }));
    bestDescOpacity.value = withDelay(800, withTiming(1, { duration: 250 }));
    bestRankScale.value = withDelay(900, withSpring(1, { damping: 8, stiffness: 180 }));
    daysOpacity.value = withDelay(1100, withTiming(1, { duration: 300 }));
    statsOpacity.value = withDelay(1500, withTiming(1, { duration: 300 }));
    buttonsOpacity.value = withDelay(2000, withTiming(1, { duration: 300 }));

    if (data.perfect_week) {
      haptic.success();
      perfectScale.value = withDelay(1200, withSequence(
        withSpring(1.15, { damping: 6, stiffness: 180 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      ));
    } else {
      haptic.light();
    }
  }, []);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleTranslateY.value }] }));
  const dateStyle = useAnimatedStyle(() => ({ opacity: dateOpacity.value }));
  const bestCardStyle = useAnimatedStyle(() => ({ opacity: bestCardOpacity.value, transform: [{ translateY: bestCardTranslateY.value }] }));
  const bestWordStyle = useAnimatedStyle(() => ({ opacity: bestWordOpacity.value }));
  const bestDescStyle = useAnimatedStyle(() => ({ opacity: bestDescOpacity.value }));
  const bestRankStyle = useAnimatedStyle(() => ({ transform: [{ scale: bestRankScale.value }] }));
  const daysStyle = useAnimatedStyle(() => ({ opacity: daysOpacity.value }));
  const statsStyle = useAnimatedStyle(() => ({ opacity: statsOpacity.value }));
  const buttonsStyle = useAnimatedStyle(() => ({ opacity: buttonsOpacity.value }));
  const perfectStyle = useAnimatedStyle(() => ({ transform: [{ scale: perfectScale.value }] }));

  const handleDismiss = () => {
    haptic.medium();
    bgOpacity.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
    setTimeout(onDismiss, 250);
  };

  const handleShare = async () => {
    if (!shareRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(shareRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 960,
        height: 1200,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
      });
    } catch {
      // user cancelled
    } finally {
      setSharing(false);
    }
  };

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <View style={styles.bgBase} />
      <View style={styles.bgOverlay} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.Text style={[styles.label, titleStyle]}>
          {t('weekly_recap.label')}
        </Animated.Text>
        <Animated.Text style={[styles.dateRange, dateStyle]}>
          {dateRange}
        </Animated.Text>

        {/* Best of the Week card */}
        {data.best_rank_word && data.best_rank_description && (
          <Animated.View style={[styles.bestCard, bestCardStyle]}>
            <Text style={styles.bestLabel}>{'\u2728'} {t('weekly_recap.best_label')} {'\u2728'}</Text>
            <Animated.Text style={[styles.bestWord, bestWordStyle]}>
              {data.best_rank_word.toUpperCase()}
            </Animated.Text>
            <Animated.Text style={[styles.bestDesc, bestDescStyle]}>
              &ldquo;{data.best_rank_description}&rdquo;
            </Animated.Text>
            <Animated.Text style={[styles.bestRank, bestRankStyle]}>
              {rankEmoji} {t('weekly_recap.rank_label', { rank: data.best_rank, total: data.best_rank_total_players })}
            </Animated.Text>
          </Animated.View>
        )}

        {/* Days played circles */}
        <Animated.View style={[styles.daysSection, daysStyle]}>
          <View style={styles.daysRow}>
            {dayCircles.map((played, i) => (
              <View
                key={i}
                style={[
                  styles.dayCircle,
                  played ? styles.dayFilled : styles.dayEmpty,
                ]}
              />
            ))}
          </View>
          {data.perfect_week ? (
            <Animated.Text style={[styles.perfectText, perfectStyle]}>
              {t('weekly_recap.perfect_week')} {'\uD83D\uDD25'}
            </Animated.Text>
          ) : (
            <Text style={styles.daysText}>
              {t('weekly_recap.days_played', { count: data.days_played })}
            </Text>
          )}
        </Animated.View>

        {/* Stats grid 2x2 */}
        <Animated.View style={[styles.statsGrid, statsStyle]}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{data.total_votes_received}</Text>
            <Text style={styles.statLabel}>{t('weekly_recap.votes_received')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>#{data.average_rank ?? '-'}</Text>
            <Text style={styles.statLabel}>{t('weekly_recap.avg_rank')}</Text>
            {improved && data.previous_week_average_rank != null && (
              <Text style={styles.improved}>
                {t('weekly_recap.improved_from', { prev: data.previous_week_average_rank })}
              </Text>
            )}
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>#{data.best_rank ?? '-'}</Text>
            <Text style={styles.statLabel}>{t('weekly_recap.best_rank')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{'\uD83D\uDD25'} {data.current_streak}</Text>
            <Text style={styles.statLabel}>{t('weekly_recap.day_streak')}</Text>
          </View>
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={[styles.buttonsSection, buttonsStyle]}>
          <Button
            title={sharing ? '...' : t('weekly_recap.share_week')}
            onPress={handleShare}
            loading={sharing}
          />
          <Button
            title={t('weekly_recap.see_today')}
            onPress={handleDismiss}
            variant="outline"
          />
          <Text style={styles.closer}>{t('weekly_recap.closer')}</Text>
        </Animated.View>
      </ScrollView>

      {/* Off-screen share card for capture */}
      <View style={styles.offScreen}>
        <WeeklyRecapShareCard ref={shareRef} data={data} dateRange={dateRange} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A1A2E',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2D1B69',
    opacity: 0.55,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#FF6B4A',
    marginBottom: spacing.xs,
  },
  dateRange: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.lg,
  },

  // Best of the Week card
  bestCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  bestLabel: {
    fontSize: fontSize.xs,
    letterSpacing: 3,
    color: '#FFD700',
    fontWeight: '700',
  },
  bestWord: {
    fontSize: fontSize.xl,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  bestDesc: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
  },
  bestRank: {
    fontSize: fontSize.md,
    color: '#FF6B4A',
    fontWeight: '600',
    marginTop: spacing.xs,
  },

  // Days played
  daysSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dayCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  dayFilled: {
    backgroundColor: '#FF6B4A',
  },
  dayEmpty: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  daysText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  perfectText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 2,
  },

  // Stats grid
  statsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
  },
  improved: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '600',
  },

  // Buttons
  buttonsSection: {
    width: '100%',
    gap: spacing.sm,
    alignItems: 'center',
  },
  closer: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.xs,
  },

  // Off-screen share card
  offScreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
});
