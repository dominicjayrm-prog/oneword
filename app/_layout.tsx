import { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { setBadgeCount } from '../src/lib/notifications';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import '../src/lib/i18n';
import { initAudio } from '../src/lib/audio';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { GameProvider } from '../src/contexts/GameContext';
import { MobileContainer } from '../src/components/MobileContainer';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { ToastProvider } from '../src/components/Toast';
import { NetworkProvider } from '../src/contexts/NetworkContext';
import { NetworkBanner } from '../src/components/NetworkBanner';

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
    const inResetPassword = segments[0] === 'reset-password';

    // Don't redirect away from the reset-password route — it needs to
    // complete the auth code exchange before navigating elsewhere.
    if (inResetPassword) return;

    // Re-read the flag from storage to catch writes from the onboarding screen,
    // which updates AsyncStorage directly without being able to set this component's state.
    AsyncStorage.getItem('hasSeenOnboarding')
      .then((value) => {
        const seen = value === 'true';
        if (seen !== hasSeenOnboarding) {
          setHasSeenOnboarding(seen);
          // State update will re-trigger this effect with the correct value
          return;
        }

        if (!seen && !inOnboarding) {
          router.replace('/(onboarding)');
        } else if (seen && inOnboarding) {
          router.replace('/(game)');
        }
      })
      .catch(() => {
        // Fall back to current state if read fails
        if (!hasSeenOnboarding && !inOnboarding) {
          router.replace('/(onboarding)');
        } else if (hasSeenOnboarding && inOnboarding) {
          router.replace('/(game)');
        }
      });
  }, [onboardingChecked, hasSeenOnboarding, segments]);

  // Clear badge count when app comes to foreground
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Clear on initial mount (app open)
    setBadgeCount(0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setBadgeCount(0);
      }
    });
    return () => subscription.remove();
  }, []);

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
        <Stack.Screen
          name="favourites"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="history"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="webview"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="reset-password"
          options={{
            headerShown: false,
            animation: 'none',
          }}
        />
      </Stack>
      <NetworkBanner />
    </MobileContainer>
  );
}

// Keep the splash screen visible while we load fonts/resources
SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    initAudio();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // If fonts fail to load, render the app anyway with system font fallbacks
  // rather than blocking indefinitely on the loading spinner
  if (fontError) {
    console.warn('[RootLayout] Font loading failed, using system fallbacks:', fontError);
  }

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NetworkProvider>
          <AuthProvider>
            <GameProvider>
              <ToastProvider>
                <InnerLayout />
              </ToastProvider>
            </GameProvider>
          </AuthProvider>
        </NetworkProvider>
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
