import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { OnboardingScreen1 } from '../../src/components/onboarding/OnboardingScreen1';
import { OnboardingScreen2 } from '../../src/components/onboarding/OnboardingScreen2';
import { OnboardingScreen3 } from '../../src/components/onboarding/OnboardingScreen3';
import { DotIndicator } from '../../src/components/onboarding/DotIndicator';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!containerWidth) return;
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / containerWidth);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const goNext = () => {
    if (currentIndex < 2 && containerWidth) {
      const next = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: next * containerWidth, animated: true });
      setCurrentIndex(next);
    }
  };

  const goBack = () => {
    if (currentIndex > 0 && containerWidth) {
      const prev = currentIndex - 1;
      scrollRef.current?.scrollTo({ x: prev * containerWidth, animated: true });
      setCurrentIndex(prev);
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    if (Platform.OS === 'web') {
      window.location.href = '/';
    } else {
      router.replace('/');
    }
  };

  const isLast = currentIndex === 2;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoOne}>one</Text>
        <Text style={styles.logoWord}>word</Text>
      </View>

      {/* Screens */}
      <View style={styles.scrollWrapper} onLayout={onLayout}>
        {containerWidth > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={16}
          >
            <View style={{ width: containerWidth, flex: 1 }}>
              <OnboardingScreen1 isActive={currentIndex === 0} />
            </View>
            <View style={{ width: containerWidth, flex: 1 }}>
              <OnboardingScreen2 isActive={currentIndex === 1} />
            </View>
            <View style={{ width: containerWidth, flex: 1 }}>
              <OnboardingScreen3 isActive={currentIndex === 2} />
            </View>
          </ScrollView>
        )}
      </View>

      {/* Bottom section */}
      <View style={styles.bottom}>
        <DotIndicator total={3} current={currentIndex} />

        <View style={styles.buttons}>
          {currentIndex > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {isLast ? (
            <TouchableOpacity
              style={styles.finishButton}
              onPress={handleFinish}
              activeOpacity={0.8}
            >
              <Text style={styles.finishButtonText}>Let&apos;s play →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={goNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  logoOne: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#1A1A2E',
  },
  logoWord: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#FF6B4A',
  },
  scrollWrapper: {
    flex: 1,
  },
  bottom: {
    paddingHorizontal: 24,
    gap: 16,
    paddingBottom: 4,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  backButton: {
    width: 90,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E3D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  finishButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF6B4A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
