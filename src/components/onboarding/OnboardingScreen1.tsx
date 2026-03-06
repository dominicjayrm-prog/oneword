import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Props {
  isActive: boolean;
}

export function OnboardingScreen1({ isActive }: Props) {
  const { t } = useTranslation();
  const words = t('onboarding.screen1_example', { returnObjects: true }) as unknown as string[];

  const labelOpacity = useRef(new Animated.Value(0)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordScale = useRef(new Animated.Value(0.9)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const promptOpacity = useRef(new Animated.Value(0)).current;
  const counterOpacity = useRef(new Animated.Value(0)).current;
  const pillOpacities = useRef(words.map(() => new Animated.Value(0))).current;
  const pillScales = useRef(words.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (isActive) {
      labelOpacity.setValue(0);
      wordOpacity.setValue(0);
      wordScale.setValue(0.9);
      subtitleOpacity.setValue(0);
      promptOpacity.setValue(0);
      counterOpacity.setValue(0);
      pillOpacities.forEach((v) => v.setValue(0));
      pillScales.forEach((v) => v.setValue(0));

      const pillAnimations = words.map((_, i) =>
        Animated.parallel([
          Animated.spring(pillScales[i], {
            toValue: 1,
            damping: 8,
            stiffness: 150,
            mass: 0.6,
            useNativeDriver: true,
          }),
          Animated.timing(pillOpacities[i], {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      );

      Animated.sequence([
        Animated.timing(labelOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.delay(100),
        Animated.parallel([
          Animated.timing(wordOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.spring(wordScale, { toValue: 1, damping: 12, stiffness: 100, useNativeDriver: true }),
        ]),
        Animated.delay(200),
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(400),
        Animated.timing(promptOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(300),
        Animated.stagger(300, pillAnimations),
        Animated.delay(200),
        Animated.timing(counterOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    } else {
      labelOpacity.setValue(0);
      wordOpacity.setValue(0);
      wordScale.setValue(0.9);
      subtitleOpacity.setValue(0);
      promptOpacity.setValue(0);
      counterOpacity.setValue(0);
      pillOpacities.forEach((v) => v.setValue(0));
      pillScales.forEach((v) => v.setValue(0));
    }
  }, [isActive]);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.label, { opacity: labelOpacity }]}>
        {t('onboarding.screen1_label')}
      </Animated.Text>

      <Animated.View style={{ opacity: wordOpacity, transform: [{ scale: wordScale }] }}>
        <Text style={styles.word}>{t('onboarding.screen1_example_word')}</Text>
      </Animated.View>

      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        {t('onboarding.screen1_subtitle')}
      </Animated.Text>

      <Animated.Text style={[styles.prompt, { opacity: promptOpacity }]}>
        {t('onboarding.screen1_prompt')}
      </Animated.Text>

      <View style={styles.pillsContainer}>
        {words.map((word: string, i: number) => (
          <Animated.View
            key={`${word}-${i}`}
            style={[
              styles.pill,
              {
                opacity: pillOpacities[i],
                transform: [{ scale: pillScales[i] }],
              },
            ]}
          >
            <Text style={styles.pillText}>{word}</Text>
          </Animated.View>
        ))}
      </View>

      <Animated.Text style={[styles.counter, { opacity: counterOpacity }]}>
        {t('onboarding.screen1_counter')}
      </Animated.Text>
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
    marginBottom: 20,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 320,
    marginBottom: 20,
  },
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
  counter: {
    fontSize: 15,
    fontFamily: 'DMMono_400Regular',
    color: '#FF6B4A',
    marginTop: 4,
  },
});
