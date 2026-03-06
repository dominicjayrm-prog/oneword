import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  isActive: boolean;
}

const ENTRIES = [
  { emoji: '🥇', desc: '"Where fish pay no rent"', user: '@sara', votes: 847, gold: true },
  { emoji: '🥈', desc: '"God\'s swimming pool, no lifeguard"', user: '@mike', votes: 723, gold: false },
  { emoji: '🥉', desc: '"Big salty infinity bath time"', user: '@luna', votes: 694, gold: false },
];

const STATS = [
  { emoji: '🔥', value: '12', label: 'DAY STREAK' },
  { emoji: '🏆', value: '#3', label: 'BEST RANK' },
  { emoji: '📤', value: 'share', label: 'RESULTS' },
];

export function OnboardingScreen3({ isActive }: Props) {
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  const entryOpacities = useRef(ENTRIES.map(() => new Animated.Value(0))).current;
  const entryTranslateYs = useRef(ENTRIES.map(() => new Animated.Value(30))).current;

  const statsOpacity = useRef(new Animated.Value(0)).current;
  const statsTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (isActive) {
      // Reset
      labelOpacity.setValue(0);
      titleOpacity.setValue(0);
      subtitleOpacity.setValue(0);
      entryOpacities.forEach((v) => v.setValue(0));
      entryTranslateYs.forEach((v) => v.setValue(30));
      statsOpacity.setValue(0);
      statsTranslateY.setValue(20);

      const entryAnimations = ENTRIES.map((_, i) =>
        Animated.parallel([
          Animated.timing(entryOpacities[i], { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(entryTranslateYs[i], { toValue: 0, damping: 14, stiffness: 120, useNativeDriver: true }),
        ])
      );

      Animated.sequence([
        // Header
        Animated.parallel([
          Animated.timing(labelOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(titleOpacity, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
          Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
        ]),

        // Leaderboard entries cascade
        Animated.delay(100),
        Animated.stagger(500, entryAnimations),

        // Stats
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(statsOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(statsTranslateY, { toValue: 0, damping: 14, stiffness: 120, useNativeDriver: true }),
        ]),
      ]).start();
    } else {
      labelOpacity.setValue(0);
      titleOpacity.setValue(0);
      subtitleOpacity.setValue(0);
      entryOpacities.forEach((v) => v.setValue(0));
      entryTranslateYs.forEach((v) => v.setValue(30));
      statsOpacity.setValue(0);
      statsTranslateY.setValue(20);
    }
  }, [isActive]);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.label, { opacity: labelOpacity }]}>
        CLIMB THE RANKS
      </Animated.Text>
      <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
        Compete globally
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        Build streaks. Top the leaderboard. Share your best.
      </Animated.Text>

      {/* Leaderboard */}
      <View style={styles.leaderboard}>
        {ENTRIES.map((entry, i) => (
          <Animated.View
            key={i}
            style={[
              styles.entry,
              entry.gold && styles.entryGold,
              {
                opacity: entryOpacities[i],
                transform: [{ translateY: entryTranslateYs[i] }],
              },
            ]}
          >
            <Text style={styles.entryEmoji}>{entry.emoji}</Text>
            <View style={styles.entryInfo}>
              <Text style={styles.entryDesc}>{entry.desc}</Text>
              <Text style={styles.entryUser}>{entry.user}</Text>
            </View>
            <Text style={styles.entryVotes}>{entry.votes}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Stats row */}
      <Animated.View
        style={[
          styles.statsRow,
          {
            opacity: statsOpacity,
            transform: [{ translateY: statsTranslateY }],
          },
        ]}
      >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 12,
    letterSpacing: 3,
    color: '#8B8697',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#8B8697',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
  },
  leaderboard: {
    width: '100%',
    gap: 8,
    marginBottom: 20,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E3D9',
    paddingVertical: 12,
    paddingHorizontal: 12,
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
