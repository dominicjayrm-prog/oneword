import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { haptic } from '../lib/haptics';
import { getCurrentBadge, getNextBadge, getProgressToNext, type BadgeTier } from '../lib/badges';
import { useAuthContext } from '../contexts/AuthContext';
import { fontSize, spacing } from '../constants/theme';

interface StreakCelebrationProps {
  streak: number;
  badge: BadgeTier;
  onDismiss: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Particle {
  x: number;
  y: number;
  angle: number;
  speed: number;
  drift: number;
  delay: number;
  size: number;
  isRect: boolean;
  colorIndex: number; // 0 = badge, 1 = white, 2 = gold
}

function generateParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: 0,
      y: 0,
      angle: Math.random() * Math.PI * 2,
      speed: 1 + Math.random() * 3,
      drift: (Math.random() - 0.5) * 2,
      delay: Math.random() * 500,
      size: 3 + Math.random() * 4,
      isRect: Math.random() > 0.5,
      colorIndex: Math.floor(Math.random() * 3),
    });
  }
  return particles;
}

function ConfettiParticle({ particle, badgeColor }: { particle: Particle; badgeColor: string }) {
  const colors = [badgeColor, '#FFFFFF', '#FFD700'];
  const color = colors[particle.colorIndex];

  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const totalDelay = 500 + particle.delay;
    progress.value = withDelay(
      totalDelay,
      withTiming(1, { duration: 1500 + Math.random() * 500, easing: Easing.out(Easing.cubic) }),
    );
    opacity.value = withDelay(totalDelay + 1000, withTiming(0, { duration: 500 }));
  }, []);

  const style = useAnimatedStyle(() => {
    const distance = progress.value * particle.speed * 120;
    const tx = Math.cos(particle.angle) * distance + particle.drift * progress.value * 40;
    const ty = Math.sin(particle.angle) * distance + progress.value * progress.value * 80; // gravity
    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { rotate: `${progress.value * 720}deg` },
        { scale: 1 - progress.value * 0.5 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: particle.isRect ? 3 : particle.size,
          height: particle.isRect ? particle.size + 4 : particle.size,
          borderRadius: particle.isRect ? 1 : particle.size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function RingBurst({ delay, badgeColor }: { delay: number; badgeColor: string }) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    const totalDelay = 500 + delay;
    scale.value = withDelay(totalDelay, withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(totalDelay, withTiming(0, { duration: 1200, easing: Easing.out(Easing.cubic) }));
  }, []);

  const style = useAnimatedStyle(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transform: [{ scale: scale.value }] as any,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: 150,
          borderWidth: 2,
          borderColor: badgeColor,
        },
        style,
      ]}
    />
  );
}

export function StreakCelebration({ streak, badge, onDismiss }: StreakCelebrationProps) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuthContext();
  const isEternal = streak >= 365;
  const isEs = i18n.language === 'es';

  const particleCount = isEternal ? 50 : 35;
  const ringCount = isEternal ? 5 : 3;
  const particles = useMemo(() => generateParticles(particleCount), []);
  const next = getNextBadge(streak);
  const progress = getProgressToNext(streak);

  // Animated values
  const bgOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const emojiScale = useSharedValue(2.5);
  const emojiTranslateY = useSharedValue(-30);
  const emojiOpacity = useSharedValue(0);
  const numberScale = useSharedValue(0.5);
  const numberOpacity = useSharedValue(0);
  const nameTranslateY = useSharedValue(15);
  const nameOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(15);
  const taglineOpacity = useSharedValue(0);
  const statsTranslateY = useSharedValue(12);
  const statsOpacity = useSharedValue(0);
  const nextTranslateY = useSharedValue(12);
  const nextOpacity = useSharedValue(0);
  const dismissOpacity = useSharedValue(0);

  useEffect(() => {
    // Phase 1: Background (0-400ms)
    bgOpacity.value = withTiming(1, { duration: 400 });
    glowOpacity.value = withDelay(200, withTiming(0.6, { duration: 400 }));

    // Phase 2: Confetti + rings at 500ms (handled by particle components)
    const t1 = setTimeout(() => {
      haptic.heavy();
      if (isEternal) {
        t2 = setTimeout(() => haptic.success(), 300);
      }
    }, 500);
    let t2: ReturnType<typeof setTimeout> | undefined;

    // Phase 3: Emoji (500ms)
    emojiOpacity.value = withDelay(500, withTiming(1, { duration: 100 }));
    emojiScale.value = withDelay(500, withSpring(1, { damping: 8, stiffness: 150 }));
    emojiTranslateY.value = withDelay(500, withSpring(0, { damping: 8, stiffness: 150 }));

    // Phase 4: Streak number (1200ms)
    numberOpacity.value = withDelay(1200, withTiming(1, { duration: 300 }));
    numberScale.value = withDelay(1200, withSpring(1, { damping: 8, stiffness: 180 }));

    // Phase 5: Badge name + tagline (1600ms)
    nameOpacity.value = withDelay(1600, withTiming(1, { duration: 500 }));
    nameTranslateY.value = withDelay(1600, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    taglineOpacity.value = withDelay(1750, withTiming(1, { duration: 500 }));
    taglineTranslateY.value = withDelay(1750, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));

    // Phase 6: Stats (2200ms)
    statsOpacity.value = withDelay(2200, withTiming(1, { duration: 500 }));
    statsTranslateY.value = withDelay(2200, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));

    // Phase 7: Next milestone + dismiss (2800ms)
    nextOpacity.value = withDelay(2800, withTiming(1, { duration: 500 }));
    nextTranslateY.value = withDelay(2800, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    dismissOpacity.value = withDelay(3000, withTiming(1, { duration: 300 }));

    return () => {
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, []);

  const handleDismiss = () => {
    bgOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
  };

  // Animated styles
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type TransformWorkaround = any; // RN 0.83 transform type incompatibility with Reanimated
  const emojiStyle = useAnimatedStyle(() => ({
    opacity: emojiOpacity.value,
    transform: [{ scale: emojiScale.value }, { translateY: emojiTranslateY.value }] as TransformWorkaround,
  }));
  const numberStyle = useAnimatedStyle(() => ({
    opacity: numberOpacity.value,
    transform: [{ scale: numberScale.value }] as TransformWorkaround,
  }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
    transform: [{ translateY: nameTranslateY.value }] as TransformWorkaround,
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }] as TransformWorkaround,
  }));
  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [{ translateY: statsTranslateY.value }] as TransformWorkaround,
  }));
  const nextStyle = useAnimatedStyle(() => ({
    opacity: nextOpacity.value,
    transform: [{ translateY: nextTranslateY.value }] as TransformWorkaround,
  }));
  const dismissStyle = useAnimatedStyle(() => ({
    opacity: dismissOpacity.value,
  }));

  const badgeName = isEs ? badge.nameEs : badge.name;
  const badgeTagline = isEs ? badge.taglineEs : badge.tagline;

  return (
    <TouchableWithoutFeedback onPress={handleDismiss}>
      <Animated.View style={[styles.container, bgStyle]}>
        {/* Background gradient layers */}
        <View style={[styles.bgBase, { backgroundColor: badge.bgGrad[0] }]} />
        <View style={[styles.bgOverlay, { backgroundColor: badge.bgGrad[1] }]} />

        {/* Ambient glow */}
        <Animated.View style={[styles.glow, { backgroundColor: badge.glow }, glowStyle]} />

        {/* Ring bursts */}
        <View style={styles.centerAbsolute}>
          {Array.from({ length: ringCount }).map((_, i) => (
            <RingBurst key={i} delay={i * 150} badgeColor={badge.color} />
          ))}
        </View>

        {/* Confetti */}
        <View style={styles.centerAbsolute}>
          {particles.map((p, i) => (
            <ConfettiParticle key={i} particle={p} badgeColor={badge.color} />
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Emoji */}
          <Animated.Text style={[styles.emoji, { textShadowColor: badge.glow }, emojiStyle]}>
            {badge.emoji}
          </Animated.Text>

          {/* Streak number */}
          <Animated.View style={[styles.numberRow, numberStyle]}>
            <Text style={[styles.number, { color: badge.color, textShadowColor: badge.glow }]}>{streak}</Text>
            <Text style={styles.dayLabel}>{t('badges.day_streak')}</Text>
          </Animated.View>

          {/* Badge name */}
          <Animated.Text style={[styles.badgeName, nameStyle]}>{badgeName}</Animated.Text>

          {/* Tagline */}
          <Animated.Text style={[styles.tagline, taglineStyle]}>{badgeTagline}</Animated.Text>

          {/* Stats row */}
          <Animated.View style={[styles.statsRow, statsStyle]}>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{streak}</Text>
              <Text style={styles.statLabel}>{t('badges.played')}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{profile?.best_rank ? `#${profile.best_rank}` : '-'}</Text>
              <Text style={styles.statLabel}>{t('badges.best_rank')}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{profile?.total_votes_received ?? 0}</Text>
              <Text style={styles.statLabel}>{t('badges.votes')}</Text>
            </View>
          </Animated.View>

          {/* Next milestone or Eternal message */}
          <Animated.View style={[styles.nextSection, nextStyle]}>
            {isEternal ? (
              <Text style={[styles.eternalText, { color: '#FFD700' }]}>{t('badges.highest_tier')}</Text>
            ) : next ? (
              <View style={styles.nextCard}>
                <Text style={styles.nextLabel}>{t('badges.next_milestone')}</Text>
                <Text style={styles.nextBadge}>
                  {next.emoji} {isEs ? next.nameEs : next.name} —{' '}
                  {t('badges.days_to_go', { count: next.streak - streak })}
                </Text>
                <View style={styles.progressBarBg}>
                  <View
                    style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: badge.color }]}
                  />
                </View>
              </View>
            ) : null}
          </Animated.View>

          {/* Tap to continue */}
          <Animated.Text style={[styles.tapText, dismissStyle]}>{t('badges.tap_continue')}</Animated.Text>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: SCREEN_HEIGHT / 2 - 150,
    left: SCREEN_WIDTH / 2 - 150,
  },
  centerAbsolute: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.35,
    left: SCREEN_WIDTH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emoji: {
    fontSize: 80,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  numberRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  number: {
    fontSize: 48,
    fontFamily: 'DMMono_500Medium',
    fontWeight: '800',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  dayLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  badgeName: {
    fontSize: 36,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  tagline: {
    fontSize: 15,
    fontFamily: 'PlayfairDisplay_400Regular',
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.5)',
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: spacing.xl,
  },
  statCol: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: fontSize.lg,
    fontFamily: 'DMMono_500Medium',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  nextSection: {
    marginTop: spacing.xl,
    width: '100%',
  },
  nextCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xs,
  },
  nextLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
  nextBadge: {
    fontSize: fontSize.sm,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  progressBarBg: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  eternalText: {
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  tapText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.15)',
    marginTop: spacing.xl,
  },
});
