import { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  isActive: boolean;
}

export function OnboardingScreen2({ isActive }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const labelOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card1TranslateX = useRef(new Animated.Value(-60)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card2TranslateX = useRef(new Animated.Value(60)).current;

  const card1Scale = useRef(new Animated.Value(1)).current;
  const card1Selected = useRef(new Animated.Value(0)).current;
  const card2Scale = useRef(new Animated.Value(1)).current;
  const card2Fade = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  const progressOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  // Memoize Animated.multiply so it doesn't create a new native node on every render
  const card2CombinedOpacity = useMemo(
    () => Animated.multiply(card2Opacity, card2Fade),
    [card2Opacity, card2Fade]
  );

  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isActive) {
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

      const animation = Animated.sequence([
        Animated.parallel([
          Animated.timing(labelOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(titleOpacity, { toValue: 1, duration: 280, delay: 70, useNativeDriver: true }),
          Animated.timing(subtitleOpacity, { toValue: 1, duration: 280, delay: 140, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(card1Opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(card1TranslateX, { toValue: 0, damping: 15, stiffness: 180, useNativeDriver: true }),
        ]),
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(card2Opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(card2TranslateX, { toValue: 0, damping: 15, stiffness: 180, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(progressOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(progressWidth, { toValue: 27, duration: 420, useNativeDriver: false }),
        ]),
        Animated.delay(500),
        Animated.parallel([
          Animated.spring(card1Scale, { toValue: 1.02, damping: 10, stiffness: 200, useNativeDriver: true }),
          Animated.timing(card1Selected, { toValue: 1, duration: 200, useNativeDriver: false }),
          Animated.spring(card2Scale, { toValue: 0.97, damping: 10, stiffness: 200, useNativeDriver: true }),
          Animated.timing(card2Fade, { toValue: 0.4, duration: 200, useNativeDriver: true }),
          Animated.spring(badgeScale, { toValue: 1, damping: 8, stiffness: 260, useNativeDriver: true }),
        ]),
      ]);
      animationRef.current = animation;
      animation.start();
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

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [isActive]);

  const card1BorderColor = card1Selected.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const card1Bg = card1Selected.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.primaryLight],
  });

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.label, { color: colors.textMuted, opacity: labelOpacity }]}>
        {t('onboarding.screen2_label')}
      </Animated.Text>
      <Animated.Text style={[styles.title, { color: colors.text, opacity: titleOpacity }]}>
        {t('onboarding.screen2_title')}
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, { color: colors.textMuted, opacity: subtitleOpacity }]}>
        {t('onboarding.screen2_subtitle')}
      </Animated.Text>

      {/* Card 1 */}
      <View style={styles.cardWrapper}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: card1Bg,
              borderColor: card1BorderColor,
              opacity: card1Opacity,
              transform: [{ translateX: card1TranslateX }, { scale: card1Scale }],
            },
          ]}
        >
          <Text style={[styles.cardText, { color: colors.text }]}>
            {'\u201C'}
            {t('onboarding.screen2_desc1')}
            {'\u201D'}
          </Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.badge,
            {
              backgroundColor: colors.primary,
              transform: [{ scale: badgeScale }],
              opacity: badgeScale,
            },
          ]}
        >
          <Text style={styles.badgeText}>{t('onboarding.screen2_pick')}</Text>
        </Animated.View>
      </View>

      {/* Card 2 */}
      <Animated.View
        style={[
          styles.card,
          styles.card2,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: card2CombinedOpacity,
            transform: [{ translateX: card2TranslateX }, { scale: card2Scale }],
          },
        ]}
      >
        <Text style={[styles.cardText, { color: colors.text }]}>
          {'\u201C'}
          {t('onboarding.screen2_desc2')}
          {'\u201D'}
        </Text>
      </Animated.View>

      {/* Progress */}
      <Animated.View style={[styles.progressContainer, { opacity: progressOpacity }]}>
        <Text style={[styles.progressText, { color: colors.textMuted }]}>{t('onboarding.screen2_progress')}</Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
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
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
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
    borderRadius: 16,
    borderWidth: 1.5,
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
    fontStyle: 'italic',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: -4,
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
  },
  progressTrack: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
