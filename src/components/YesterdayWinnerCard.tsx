import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './Button';
import { fontSize, spacing, borderRadius } from '../constants/theme';
import { haptic } from '../lib/haptics';
import type { YesterdayWinner } from '../types/database';

interface Props {
  data: YesterdayWinner;
  onDismiss: () => void;
}

export function YesterdayWinnerCard({ data, onDismiss }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Animation values
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const medalScale = useSharedValue(0);
  const descOpacity = useSharedValue(0);
  const userInfoOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  // Celebration-specific
  const celebScale = useSharedValue(0);

  useEffect(() => {
    // Staggered entrance
    cardOpacity.value = withTiming(1, { duration: 400 });
    cardTranslateY.value = withSpring(0, { damping: 15, stiffness: 120 });
    medalScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 150 }));
    descOpacity.value = withDelay(350, withTiming(1, { duration: 300 }));
    userInfoOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
    buttonOpacity.value = withDelay(650, withTiming(1, { duration: 300 }));

    if (data.user_was_winner) {
      haptic.success();
      celebScale.value = withDelay(200, withSequence(
        withSpring(1.15, { damping: 6, stiffness: 180 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      ));
    } else {
      haptic.light();
    }
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const medalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: medalScale.value }],
  }));

  const descStyle = useAnimatedStyle(() => ({
    opacity: descOpacity.value,
  }));

  const userInfoStyle = useAnimatedStyle(() => ({
    opacity: userInfoOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const celebStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebScale.value }],
  }));

  const handleDismiss = () => {
    haptic.medium();
    // Animate out
    cardOpacity.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
    cardTranslateY.value = withTiming(-60, { duration: 300, easing: Easing.out(Easing.cubic) });
    // Let animation play, then dismiss
    setTimeout(onDismiss, 300);
  };

  // Celebration variant when user won
  if (data.user_was_winner) {
    return (
      <Animated.View style={[styles.container, cardStyle]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.gold + '40' }]}>
          <Animated.Text style={[styles.celebEmoji, celebStyle]}>
            {'\uD83C\uDF89 '}YOU WON{' \uD83C\uDF89'}
          </Animated.Text>
          <Animated.View style={celebStyle}>
            <Text style={[styles.celebTitle, { color: colors.gold }]}>
              {t('yesterday_winner.you_won')}
            </Text>
          </Animated.View>

          <View style={styles.wordRow}>
            <Text style={[styles.wordText, { color: colors.text }]}>
              {data.word.toUpperCase()}
            </Text>
            <Text style={[styles.wordMeta, { color: colors.textMuted }]}>
              {data.word_category}
            </Text>
          </View>

          <Animated.View style={[styles.descriptionBox, { backgroundColor: colors.background, borderColor: colors.gold + '30' }, descStyle]}>
            <Text style={styles.medal}>{'\uD83E\uDD47'}</Text>
            <Text style={[styles.descriptionText, { color: colors.text }]}>
              &ldquo;{data.winner_description}&rdquo;
            </Text>
            <Text style={[styles.voteCount, { color: colors.primary }]}>
              {t('yesterday_winner.votes', { count: data.winner_votes })}
            </Text>
          </Animated.View>

          <Animated.View style={buttonStyle}>
            <Button title={t('yesterday_winner.see_today')} onPress={handleDismiss} />
          </Animated.View>
        </View>
      </Animated.View>
    );
  }

  // Normal winner showcase
  return (
    <Animated.View style={[styles.container, cardStyle]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t('yesterday_winner.label')}
        </Text>

        <View style={styles.wordRow}>
          <Text style={[styles.wordText, { color: colors.text }]}>
            {data.word.toUpperCase()}
          </Text>
          <Text style={[styles.wordMeta, { color: colors.textMuted }]}>
            {data.word_category}
          </Text>
        </View>

        <Animated.View style={[styles.descriptionBox, { backgroundColor: colors.background, borderColor: colors.border }, descStyle]}>
          <Animated.Text style={[styles.medal, medalStyle]}>{'\uD83E\uDD47'}</Animated.Text>
          <Text style={[styles.descriptionText, { color: colors.text }]}>
            &ldquo;{data.winner_description}&rdquo;
          </Text>
          <Animated.View style={userInfoStyle}>
            <Text style={[styles.winnerInfo, { color: colors.textMuted }]}>
              @{data.winner_username} {'  \u00B7  '}
              <Text style={{ color: colors.primary }}>{t('yesterday_winner.votes', { count: data.winner_votes })}</Text>
            </Text>
          </Animated.View>
        </Animated.View>

        {/* User's own rank or "didn't play" */}
        <Animated.View style={[styles.userSection, userInfoStyle]}>
          {data.user_rank != null && data.user_description ? (
            <>
              <Text style={[styles.userRank, { color: colors.textSecondary }]}>
                {t('yesterday_winner.your_rank', { rank: data.user_rank, total: data.total_descriptions })}
              </Text>
              <Text style={[styles.userDesc, { color: colors.textMuted }]}>
                &ldquo;{data.user_description}&rdquo;
              </Text>
            </>
          ) : (
            <Text style={[styles.didntPlay, { color: colors.textMuted }]}>
              {t('yesterday_winner.didnt_play')}
            </Text>
          )}
        </Animated.View>

        <Animated.View style={[styles.bottomSection, buttonStyle]}>
          <Button title={t('yesterday_winner.see_today')} onPress={handleDismiss} />
          <Text style={[styles.motivational, { color: colors.textMuted }]}>
            {t('yesterday_winner.beat_this')}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 3,
  },
  wordRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  wordText: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  wordMeta: {
    fontSize: fontSize.sm,
  },
  descriptionBox: {
    width: '100%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  medal: {
    fontSize: 32,
  },
  descriptionText: {
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },
  winnerInfo: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  voteCount: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  userSection: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  userRank: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  userDesc: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  didntPlay: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  motivational: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  celebEmoji: {
    fontSize: 28,
    textAlign: 'center',
  },
  celebTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
  },
});
