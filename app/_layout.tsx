import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';
import '../src/lib/i18n';
import { initSentry } from '../src/lib/sentry';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { GameProvider } from '../src/contexts/GameContext';
import { MobileContainer } from '../src/components/MobileContainer';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { ToastProvider } from '../src/components/Toast';
import { NetworkBanner } from '../src/components/NetworkBanner';

initSentry();

function InnerLayout() {
  const { colors, mode } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding')
      .then((value) => {
        setHasSeenOnboarding(value === 'true');
      })
      .catch((err) => {
        console.warn('[RootLayout] Failed to read onboarding state:', err);
      })
      .finally(() => {
        setOnboardingChecked(true);
      });
  }, []);

  useEffect(() => {
    if (!onboardingChecked) return;

    const inOnboarding = segments[0] === '(onboarding)';

    if (!hasSeenOnboarding && !inOnboarding) {
      router.replace('/(onboarding)');
    } else if (hasSeenOnboarding && inOnboarding) {
      router.replace('/');
    }
  }, [onboardingChecked, hasSeenOnboarding, segments]);

  // Handle notification taps — navigate to the relevant screen
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      switch (data?.type) {
        case 'daily_reminder':
        case 'streak_risk':
        case 'milestone':
        case 'welcome_back':
        case 'weekly_recap':
          router.push('/(game)');
          break;
        case 'results_ready':
          router.push('/(game)/results');
          break;
        case 'friend_request':
        case 'friend_activity':
          router.push('/(game)/friends');
          break;
        default:
          router.push('/(game)');
      }
    });
    return () => subscription.remove();
  }, []);

  if (!onboardingChecked) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <MobileContainer>
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(game)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen
          name="profile"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      <NetworkBanner />
    </MobileContainer>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  // If fonts fail to load, render the app anyway with system font fallbacks
  // rather than blocking indefinitely on the loading spinner
  if (fontError) {
    console.warn('[RootLayout] Font loading failed, using system fallbacks:', fontError);
  }

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#FF6B4A" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <GameProvider>
            <ToastProvider>
              <InnerLayout />
            </ToastProvider>
          </GameProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
  },
});
