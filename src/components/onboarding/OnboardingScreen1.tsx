import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { WordPill } from './WordPill';

const WORDS = ['Where', 'fish', 'pay', 'no', 'rent'];

interface Props {
  isActive: boolean;
}

export function OnboardingScreen1({ isActive }: Props) {
  const labelOpacity = useSharedValue(0);
  const wordOpacity = useSharedValue(0);
  const wordScale = useSharedValue(0.9);
  const subtitleOpacity = useSharedValue(0);
  const promptOpacity = useSharedValue(0);
  const counterOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Reset
      labelOpacity.value = 0;
      wordOpacity.value = 0;
      wordScale.value = 0.9;
      subtitleOpacity.value = 0;
      promptOpacity.value = 0;
      counterOpacity.value = 0;

      // "today's word" label — immediate
      labelOpacity.value = withTiming(1, { duration: 500 });

      // "OCEAN" — fade in at 600ms
      wordOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
      wordScale.value = withDelay(600, withSpring(1, { damping: 12, stiffness: 100 }));

      // "nature · day 1" subtitle
      subtitleOpacity.value = withDelay(1000, withTiming(1, { duration: 400 }));

      // "describe it" prompt
      promptOpacity.value = withDelay(1800, withTiming(1, { duration: 400 }));

      // "5/5 words" counter
      counterOpacity.value = withDelay(4000, withTiming(1, { duration: 400 }));
    } else {
      labelOpacity.value = 0;
      wordOpacity.value = 0;
      wordScale.value = 0.9;
      subtitleOpacity.value = 0;
      promptOpacity.value = 0;
      counterOpacity.value = 0;
    }
  }, [isActive]);

  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ scale: wordScale.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const promptStyle = useAnimatedStyle(() => ({ opacity: promptOpacity.value }));
  const counterStyle = useAnimatedStyle(() => ({ opacity: counterOpacity.value }));

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.label, labelStyle]}>TODAY&apos;S WORD</Animated.Text>

      <Animated.View style={wordStyle}>
        <Text style={styles.word}>OCEAN</Text>
      </Animated.View>

      <Animated.Text style={[styles.subtitle, subtitleStyle]}>nature · day 1</Animated.Text>

      <Animated.Text style={[styles.prompt, promptStyle]}>
        DESCRIBE IT IN EXACTLY 5 WORDS
      </Animated.Text>

      <View style={styles.pillsContainer}>
        {WORDS.map((word, i) => (
          <WordPill key={word} word={word} index={i} isActive={isActive} />
        ))}
      </View>

      <Animated.Text style={[styles.counter, counterStyle]}>5/5 words ✓</Animated.Text>
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
    marginBottom: 16,
  },
  word: {
    fontSize: 64,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#8B8697',
    marginTop: 8,
    marginBottom: 32,
  },
  prompt: {
    fontSize: 11,
    letterSpacing: 2.5,
    color: '#8B8697',
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 320,
    marginBottom: 20,
  },
  counter: {
    fontSize: 15,
    fontFamily: 'DMMono_400Regular',
    color: '#FF6B4A',
    marginTop: 4,
  },
});
