import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  isActive: boolean;
}

export function OnboardingScreen2({ isActive }: Props) {
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card1TranslateX = useRef(new Animated.Value(-60)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card2TranslateX = useRef(new Animated.Value(60)).current;

  const card1Scale = useRef(new Animated.Value(1)).current;
  const card1Selected = useRef(new Animated.Value(0)).current; // 0=no, 1=yes
  const card2Scale = useRef(new Animated.Value(1)).current;
  const card2Fade = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  const progressOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Reset
      labelOpacity.setValue(0);
      titleOpacity.setValue(0);
      subtitleOpacity.setValue(0);
      card1Opacity.setValue(0);
      card1TranslateX.setValue(-60);
      card2Opacity.setValue(0);
      card2TranslateX.setValue(60);
      card1Scale.setValue(1);
      card1Selected.setValue(0);
      card2Scale.setValue(1);
      card2Fade.setValue(1);
      badgeScale.setValue(0);
      progressOpacity.setValue(0);
      progressWidth.setValue(0);

      Animated.sequence([
        // Header
        Animated.parallel([
          Animated.timing(labelOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(titleOpacity, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
          Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
        ]),

        // Card 1 slides in from left
        Animated.parallel([
          Animated.timing(card1Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(card1TranslateX, { toValue: 0, damping: 15, stiffness: 120, useNativeDriver: true }),
        ]),

        // Card 2 slides in from right
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(card2Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(card2TranslateX, { toValue: 0, damping: 15, stiffness: 120, useNativeDriver: true }),
        ]),

        // Progress bar
        Animated.parallel([
          Animated.timing(progressOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(progressWidth, { toValue: 27, duration: 600, useNativeDriver: false }),
        ]),

        // Vote selection after pause
        Animated.delay(800),
        Animated.parallel([
          Animated.spring(card1Scale, { toValue: 1.02, damping: 10, stiffness: 150, useNativeDriver: true }),
          Animated.timing(card1Selected, { toValue: 1, duration: 300, useNativeDriver: false }),
          Animated.spring(card2Scale, { toValue: 0.97, damping: 10, stiffness: 150, useNativeDriver: true }),
          Animated.timing(card2Fade, { toValue: 0.4, duration: 300, useNativeDriver: true }),
          Animated.spring(badgeScale, { toValue: 1, damping: 8, stiffness: 200, useNativeDriver: true }),
        ]),
      ]).start();
    } else {
      labelOpacity.setValue(0);
      titleOpacity.setValue(0);
      subtitleOpacity.setValue(0);
      card1Opacity.setValue(0);
      card1TranslateX.setValue(-60);
      card2Opacity.setValue(0);
      card2TranslateX.setValue(60);
      card1Scale.setValue(1);
      card1Selected.setValue(0);
      card2Scale.setValue(1);
      card2Fade.setValue(1);
      badgeScale.setValue(0);
      progressOpacity.setValue(0);
      progressWidth.setValue(0);
    }
  }, [isActive]);

  const card1BorderColor = card1Selected.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E8E3D9', '#FF6B4A'],
  });

  const card1Bg = card1Selected.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', '#FFF0EC'],
  });

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.label, { opacity: labelOpacity }]}>
        THE WORLD VOTES
      </Animated.Text>
      <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
        Which is better?
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        Tap to vote. The best descriptions rise to the top.
      </Animated.Text>

      {/* Card 1 */}
      <View style={styles.cardWrapper}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: card1Opacity,
              transform: [{ translateX: card1TranslateX }, { scale: card1Scale }],
              borderColor: card1BorderColor,
              backgroundColor: card1Bg,
            },
          ]}
        >
          <Text style={styles.cardText}>&ldquo;Where fish pay no rent&rdquo;</Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.badge,
            {
              transform: [{ scale: badgeScale }],
              opacity: badgeScale,
            },
          ]}
        >
          <Text style={styles.badgeText}>YOUR PICK ✓</Text>
        </Animated.View>
      </View>

      {/* Card 2 */}
      <Animated.View
        style={[
          styles.card,
          styles.card2,
          {
            opacity: Animated.multiply(card2Opacity, card2Fade),
            transform: [{ translateX: card2TranslateX }, { scale: card2Scale }],
          },
        ]}
      >
        <Text style={styles.cardText}>&ldquo;God&apos;s swimming pool, no lifeguard&rdquo;</Text>
      </Animated.View>

      {/* Progress */}
      <Animated.View style={[styles.progressContainer, { opacity: progressOpacity }]}>
        <Text style={styles.progressText}>vote 4 of 15</Text>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
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
