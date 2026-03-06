import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface Props {
  isActive: boolean;
}

export function OnboardingScreen2({ isActive }: Props) {
  const labelOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  const card1TranslateX = useSharedValue(-60);
  const card1Opacity = useSharedValue(0);
  const card2TranslateX = useSharedValue(60);
  const card2Opacity = useSharedValue(0);

  // Vote selection
  const card1Scale = useSharedValue(1);
  const card1BorderColor = useSharedValue(0); // 0 = border, 1 = coral
  const card1BgOpacity = useSharedValue(0);
  const card2Scale = useSharedValue(1);
  const card2FadeOpacity = useSharedValue(1);
  const badgeOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0);

  const progressOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Reset all
      labelOpacity.value = 0;
      titleOpacity.value = 0;
      subtitleOpacity.value = 0;
      card1TranslateX.value = -60;
      card1Opacity.value = 0;
      card2TranslateX.value = 60;
      card2Opacity.value = 0;
      card1Scale.value = 1;
      card1BorderColor.value = 0;
      card1BgOpacity.value = 0;
      card2Scale.value = 1;
      card2FadeOpacity.value = 1;
      badgeOpacity.value = 0;
      badgeScale.value = 0;
      progressOpacity.value = 0;
      progressWidth.value = 0;

      // Label + title
      labelOpacity.value = withTiming(1, { duration: 400 });
      titleOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
      subtitleOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));

      // Cards slide in
      card1Opacity.value = withDelay(400, withTiming(1, { duration: 400 }));
      card1TranslateX.value = withDelay(400, withSpring(0, { damping: 15, stiffness: 120 }));
      card2Opacity.value = withDelay(800, withTiming(1, { duration: 400 }));
      card2TranslateX.value = withDelay(800, withSpring(0, { damping: 15, stiffness: 120 }));

      // Progress bar
      progressOpacity.value = withDelay(1200, withTiming(1, { duration: 300 }));
      progressWidth.value = withDelay(1400, withTiming(27, { duration: 600 }));

      // Vote selection at 2600ms
      card1Scale.value = withDelay(2600, withSpring(1.02, { damping: 10, stiffness: 150 }));
      card1BorderColor.value = withDelay(2600, withTiming(1, { duration: 300 }));
      card1BgOpacity.value = withDelay(2600, withTiming(1, { duration: 300 }));
      card2Scale.value = withDelay(2600, withSpring(0.97, { damping: 10, stiffness: 150 }));
      card2FadeOpacity.value = withDelay(2600, withTiming(0.4, { duration: 300 }));
      badgeOpacity.value = withDelay(2700, withTiming(1, { duration: 200 }));
      badgeScale.value = withDelay(2700, withSpring(1, { damping: 8, stiffness: 200 }));

      // Haptic on vote
      const timer = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 2600);
      return () => clearTimeout(timer);
    } else {
      labelOpacity.value = 0;
      titleOpacity.value = 0;
      subtitleOpacity.value = 0;
      card1Opacity.value = 0;
      card1TranslateX.value = -60;
      card2Opacity.value = 0;
      card2TranslateX.value = 60;
      card1Scale.value = 1;
      card1BorderColor.value = 0;
      card1BgOpacity.value = 0;
      card2Scale.value = 1;
      card2FadeOpacity.value = 1;
      badgeOpacity.value = 0;
      badgeScale.value = 0;
      progressOpacity.value = 0;
      progressWidth.value = 0;
    }
  }, [isActive]);

  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const subtitleStyle_ = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));

  const card1Style = useAnimatedStyle(() => ({
    opacity: card1Opacity.value,
    transform: [
      { translateX: card1TranslateX.value },
      { scale: card1Scale.value },
    ],
    borderColor: card1BorderColor.value === 1 ? '#FF6B4A' : '#E8E3D9',
    backgroundColor: card1BgOpacity.value === 1 ? '#FFF0EC' : '#FFFFFF',
  }));

  const card2Style = useAnimatedStyle(() => ({
    opacity: card2Opacity.value * card2FadeOpacity.value,
    transform: [
      { translateX: card2TranslateX.value },
      { scale: card2Scale.value },
    ],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [{ scale: badgeScale.value }],
  }));

  const progressContainerStyle = useAnimatedStyle(() => ({ opacity: progressOpacity.value }));
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.label, labelStyle]}>THE WORLD VOTES</Animated.Text>
      <Animated.Text style={[styles.title, titleStyle]}>Which is better?</Animated.Text>
      <Animated.Text style={[styles.subtitle, subtitleStyle_]}>
        Tap to vote. The best descriptions rise to the top.
      </Animated.Text>

      {/* Card 1 */}
      <View style={styles.cardWrapper}>
        <Animated.View style={[styles.card, card1Style]}>
          <Text style={styles.cardText}>&ldquo;Where fish pay no rent&rdquo;</Text>
        </Animated.View>
        <Animated.View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeText}>YOUR PICK ✓</Text>
        </Animated.View>
      </View>

      {/* Card 2 */}
      <Animated.View style={[styles.card, styles.card2, card2Style]}>
        <Text style={styles.cardText}>&ldquo;God&apos;s swimming pool, no lifeguard&rdquo;</Text>
      </Animated.View>

      {/* Progress */}
      <Animated.View style={[styles.progressContainer, progressContainerStyle]}>
        <Text style={styles.progressText}>vote 4 of 15</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressBarStyle]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 12,
    letterSpacing: 3,
    color: '#8B8697',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#8B8697',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  cardWrapper: {
    width: '100%',
    marginBottom: 12,
    position: 'relative',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8E3D9',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  card2: {
    marginBottom: 24,
  },
  cardText: {
    fontSize: 17,
    fontFamily: 'DMSans_500Medium',
    color: '#1A1A2E',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: -4,
    backgroundColor: '#FF6B4A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressText: {
    fontSize: 13,
    fontFamily: 'DMMono_400Regular',
    color: '#8B8697',
  },
  progressTrack: {
    width: 60,
    height: 6,
    backgroundColor: '#E8E3D9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B4A',
    borderRadius: 3,
  },
});
