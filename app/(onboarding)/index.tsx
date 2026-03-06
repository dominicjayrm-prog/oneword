import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  type ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';

import { OnboardingScreen1 } from '../../src/components/onboarding/OnboardingScreen1';
import { OnboardingScreen2 } from '../../src/components/onboarding/OnboardingScreen2';
import { OnboardingScreen3 } from '../../src/components/onboarding/OnboardingScreen3';
import { DotIndicator } from '../../src/components/onboarding/DotIndicator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SCREENS = [
  { key: '1', Component: OnboardingScreen1 },
  { key: '2', Component: OnboardingScreen2 },
  { key: '3', Component: OnboardingScreen3 },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goNext = useCallback(() => {
    if (currentIndex < SCREENS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  }, [currentIndex]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
    }
  }, [currentIndex]);

  const handleFinish = useCallback(async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/');
  }, [router]);

  const isLast = currentIndex === SCREENS.length - 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      {/* Logo */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.logoContainer}>
        <Text style={styles.logoOne}>one</Text>
        <Text style={styles.logoWord}>word</Text>
      </Animated.View>

      {/* Screens */}
      <FlatList
        ref={flatListRef}
        data={SCREENS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <View style={styles.screenContainer}>
            <item.Component isActive={currentIndex === index} />
          </View>
        )}
      />

      {/* Bottom section */}
      <View style={styles.bottom}>
        <DotIndicator total={SCREENS.length} current={currentIndex} />

        <View style={styles.buttons}>
          {currentIndex > 0 ? (
            <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backPlaceholder} />
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
  screenContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  bottom: {
    paddingHorizontal: 24,
    gap: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  backPlaceholder: {
    width: 100,
  },
  backButton: {
    width: 100,
    paddingVertical: 16,
    borderRadius: 14,
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
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  finishButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
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
