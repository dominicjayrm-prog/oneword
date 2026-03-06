import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

interface Props {
  isActive: boolean;
}

const ENTRIES = [
  { emoji: '🥇', desc: '"Where fish pay no rent"', user: '@sara', votes: 847, gold: true },
  { emoji: '🥈', desc: '"God\'s pool, no lifeguard"', user: '@mike', votes: 723, gold: false },
  { emoji: '🥉', desc: '"Big salty infinity bath"', user: '@luna', votes: 694, gold: false },
];

const STATS = [
  { emoji: '🔥', value: '12', label: 'DAY STREAK' },
  { emoji: '🏆', value: '#3', label: 'BEST RANK' },
  { emoji: '📤', value: 'share', label: 'RESULTS' },
];

export function OnboardingScreen3({ isActive }: Props) {
  const labelOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  const entry0 = useSharedValue(0);
  const entry1 = useSharedValue(0);
  const entry2 = useSharedValue(0);
  const entryTranslate0 = useSharedValue(30);
  const entryTranslate1 = useSharedValue(30);
  const entryTranslate2 = useSharedValue(30);

  const statsOpacity = useSharedValue(0);
  const statsTranslateY = useSharedValue(20);

  const entryOpacities = [entry0, entry1, entry2];
  const entryTranslates = [entryTranslate0, entryTranslate1, entryTranslate2];

  useEffect(() => {
    if (isActive) {
      // Reset
      labelOpacity.value = 0;
      titleOpacity.value = 0;
      subtitleOpacity.value = 0;
      entryOpacities.forEach((o) => { o.value = 0; });
      entryTranslates.forEach((t) => { t.value = 30; });
      statsOpacity.value = 0;
      statsTranslateY.value = 20;

      // Animate in
      labelOpacity.value = withTiming(1, { duration: 400 });
      titleOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
      subtitleOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));

      // Leaderboard entries cascade at 400, 900, 1400
      const delays = [400, 900, 1400];
      delays.forEach((d, i) => {
        entryOpacities[i].value = withDelay(d, withTiming(1, { duration: 400 }));
        entryTranslates[i].value = withDelay(d, withSpring(0, { damping: 14, stiffness: 120 }));
      });

      // Stats at 2000ms
      statsOpacity.value = withDelay(2000, withTiming(1, { duration: 500 }));
      statsTranslateY.value = withDelay(2000, withSpring(0, { damping: 14, stiffness: 120 }));
    } else {
      labelOpacity.value = 0;
      titleOpacity.value = 0;
      subtitleOpacity.value = 0;
      entryOpacities.forEach((o) => { o.value = 0; });
      entryTranslates.forEach((t) => { t.value = 30; });
      statsOpacity.value = 0;
      statsTranslateY.value = 20;
    }
  }, [isActive]);

  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const subtitleStyle_ = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [{ translateY: statsTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.label, labelStyle]}>CLIMB THE RANKS</Animated.Text>
      <Animated.Text style={[styles.title, titleStyle]}>Compete globally</Animated.Text>
      <Animated.Text style={[styles.subtitle, subtitleStyle_]}>
        Build streaks. Top the leaderboard. Share your best.
      </Animated.Text>

      {/* Leaderboard */}
      <View style={styles.leaderboard}>
        {ENTRIES.map((entry, i) => (
          <LeaderboardEntry key={i} entry={entry} opacity={entryOpacities[i]} translateY={entryTranslates[i]} />
        ))}
      </View>

      {/* Stats row */}
      <Animated.View style={[styles.statsRow, statsStyle]}>
        {STATS.map((stat, i) => (
          <View key={stat.label} style={[styles.statItem, i < STATS.length - 1 && styles.statBorder]}>
            <Text style={styles.statEmoji}>{stat.emoji}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function LeaderboardEntry({
  entry,
  opacity,
  translateY,
}: {
  entry: (typeof ENTRIES)[0];
  opacity: SharedValue<number>;
  translateY: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.entry,
        entry.gold && styles.entryGold,
        style,
      ]}
    >
      <Text style={styles.entryEmoji}>{entry.emoji}</Text>
      <View style={styles.entryInfo}>
        <Text style={styles.entryDesc}>{entry.desc}</Text>
        <Text style={styles.entryUser}>{entry.user}</Text>
      </View>
      <Text style={styles.entryVotes}>{entry.votes}</Text>
    </Animated.View>
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
    marginBottom: 24,
    lineHeight: 22,
  },
  leaderboard: {
    width: '100%',
    gap: 10,
    marginBottom: 28,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8E3D9',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  entryGold: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FFE082',
  },
  entryEmoji: {
    fontSize: 28,
  },
  entryInfo: {
    flex: 1,
  },
  entryDesc: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: '#1A1A2E',
    fontStyle: 'italic',
  },
  entryUser: {
    fontSize: 13,
    color: '#8B8697',
    marginTop: 2,
  },
  entryVotes: {
    fontSize: 18,
    fontFamily: 'DMMono_500Medium',
    color: '#FF6B4A',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E3D9',
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: '#E8E3D9',
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'DMMono_500Medium',
    color: '#1A1A2E',
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#8B8697',
    marginTop: 2,
  },
});
