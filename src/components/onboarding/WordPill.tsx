import { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { haptic } from '../../lib/haptics';

interface WordPillProps {
  word: string;
  index: number;
  isActive: boolean;
  baseDelay?: number;
}

export function WordPill({ word, index, isActive, baseDelay = 2400 }: WordPillProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      const delay = baseDelay + index * 300;
      scale.value = 0;
      opacity.value = 0;
      scale.value = withDelay(
        delay,
        withSpring(1, { damping: 8, stiffness: 150, mass: 0.6 })
      );
      opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
      // Haptic on pop
      const timer = setTimeout(() => {
        haptic.light();
      }, delay);
      return () => clearTimeout(timer);
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.pill, animatedStyle]}>
      <Text style={styles.pillText}>{word}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FF6B4A',
    backgroundColor: '#FF6B4A14',
    marginHorizontal: 4,
    marginVertical: 4,
  },
  pillText: {
    color: '#FF6B4A',
    fontSize: 16,
    fontWeight: '600',
  },
});
