import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { haptic } from '../lib/haptics';
import { spacing } from '../constants/theme';

interface FirstSubmitCelebrationProps {
  wordName: string;
  category: string;
  description: string;
  onVote: () => void;
  onResults: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Confetti colors
const CONFETTI_COLORS = ['#FF6B4A', '#FFD700', '#4A5BFF', '#2ECC71', '#FF69B4', '#FFA500', '#00CED1'];

// Shape types: 0 = square, 1 = circle, 2 = strip
interface ConfettiPiece {
  startX: number;
  delay: number;
  duration: number;
  horizontalDrift: number;
  rotation: number;
  color: string;
  shape: number;
  size: number;
}

function generateConfetti(count: number): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    pieces.push({
      startX: Math.random() * SCREEN_WIDTH,
      delay: Math.random() * 600,
      duration: 2000 + Math.random() * 2000,
      horizontalDrift: (Math.random() - 0.5) * 120,
      rotation: Math.random() * 720 - 360,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: Math.floor(Math.random() * 3),
      size: 4 + Math.random() * 6,
    });
  }
  return pieces;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransformWorkaround = any;

function ConfettiPieceView({ piece }: { piece: ConfettiPiece }) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: piece.duration, easing: Easing.in(Easing.quad) }),
    );
    opacity.value = withDelay(
      piece.delay + piece.duration * 0.7,
      withTiming(0, { duration: piece.duration * 0.3 }),
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const translateY = progress.value * 800;
    const translateX = piece.horizontalDrift * progress.value;
    const rotate = piece.rotation * progress.value;
    return {
      transform: [
        { translateX },
        { translateY },
        { rotate: `${rotate}deg` },
      ] as TransformWorkaround,
      opacity: opacity.value,
    };
  });

  const width = piece.shape === 2 ? 3 : piece.size;
  const height = piece.shape === 2 ? piece.size + 6 : piece.size;
  const borderRadius = piece.shape === 1 ? piece.size / 2 : piece.shape === 2 ? 1.5 : 1;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: -10,
          left: piece.startX,
          width,
          height,
          borderRadius,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

function PulsingDot() {
  const scale = useSharedValue(1);
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      false,
    );
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      false,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }] as TransformWorkaround,
    opacity: dotOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: '#2ECC71',
        },
        style,
      ]}
    />
  );
}

export function FirstSubmitCelebration({
  wordName,
  category,
  description,
  onVote,
  onResults,
}: FirstSubmitCelebrationProps) {
  const { t } = useTranslation();
  const confetti = useMemo(() => generateConfetti(70), []);

  // Animated values
  const emojiScale = useSharedValue(0);
  const emojiTranslateY = useSharedValue(-30);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);
  const cardScale = useSharedValue(0.85);
  const cardOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(15);

  useEffect(() => {
    // Confetti starts at 0ms — haptic
    const hapticTimer1 = setTimeout(() => {
      haptic.heavy();
    }, 0);

    // 🎉 Emoji at 300ms
    emojiScale.value = withDelay(300, withSpring(1, { damping: 8, stiffness: 150 }));
    emojiTranslateY.value = withDelay(300, withSpring(0, { damping: 8, stiffness: 150 }));

    // "You're in!" at 300ms
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    titleTranslateY.value = withDelay(300, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));

    // Success haptic when title appears
    const hapticTimer2 = setTimeout(() => {
      haptic.success();
    }, 300);

    // Subtitle at 700ms
    subtitleOpacity.value = withDelay(700, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    subtitleTranslateY.value = withDelay(700, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));

    // Card at 1100ms
    cardOpacity.value = withDelay(1100, withTiming(1, { duration: 300 }));
    cardScale.value = withDelay(1100, withSpring(1, { damping: 12, stiffness: 200 }));

    // Buttons at 1600ms
    buttonsOpacity.value = withDelay(1600, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));
    buttonsTranslateY.value = withDelay(1600, withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }));

    return () => {
      clearTimeout(hapticTimer1);
      clearTimeout(hapticTimer2);
    };
  }, []);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: emojiScale.value },
      { translateY: emojiTranslateY.value },
    ] as TransformWorkaround,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }] as TransformWorkaround,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }] as TransformWorkaround,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }] as TransformWorkaround,
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }] as TransformWorkaround,
  }));

  return (
    <View style={styles.container}>
      {/* Confetti layer — not blocking touches */}
      <View style={styles.confettiContainer} pointerEvents="none">
        {confetti.map((piece, i) => (
          <ConfettiPieceView key={i} piece={piece} />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Emoji */}
        <Animated.Text style={[styles.emoji, emojiStyle]}>
          {'\uD83C\uDF89'}
        </Animated.Text>

        {/* Title */}
        <Animated.Text style={[styles.title, titleStyle]}>
          {t('firstSubmit.title')}
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          {t('firstSubmit.subtitle')}
        </Animated.Text>

        {/* Description card */}
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardWord}>{wordName.toUpperCase()}</Text>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{category.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>
            {'\u201C'}{description}{'\u201D'}
          </Text>
          <View style={styles.cardBottomRow}>
            <PulsingDot />
            <Text style={styles.liveText}>{t('firstSubmit.liveStatus')}</Text>
          </View>
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View style={[styles.buttonsContainer, buttonsStyle]}>
          <TouchableOpacity style={styles.primaryButton} onPress={onVote} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>{t('firstSubmit.voteOnOthers')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onResults} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>{t('firstSubmit.seeResults')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 1,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_900Black',
    fontWeight: '900',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    fontWeight: '400',
    color: '#8B8697',
    textAlign: 'center',
    lineHeight: 14 * 1.4,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 74, 0.2)',
    padding: 14,
    paddingHorizontal: 16,
    width: '100%',
    marginTop: spacing.lg,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardWord: {
    fontSize: 14,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontWeight: '700',
    color: '#1A1A2E',
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 107, 74, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 8,
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    color: '#FF6B4A',
    letterSpacing: 1,
  },
  cardDescription: {
    fontSize: 16,
    fontFamily: 'DMSans_500Medium',
    fontWeight: '500',
    fontStyle: 'italic',
    color: '#1A1A2E',
    marginBottom: spacing.sm,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveText: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    fontWeight: '600',
    color: '#2ECC71',
  },
  buttonsContainer: {
    width: '100%',
    marginTop: spacing.lg,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#FF6B4A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF6B4A',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B4A',
  },
});
