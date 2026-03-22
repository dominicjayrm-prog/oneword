import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuthContext } from '../src/contexts/AuthContext';
import { supabase } from '../src/lib/supabase';

/**
 * This route catches the `oneword://reset-password?code=AUTH_CODE` deep link
 * from the password-reset email. On iOS, Expo Router may not always deliver
 * query params via useLocalSearchParams for custom URL scheme deep links, so
 * we also try reading the code directly from the Linking API as a fallback.
 */
export default function ResetPasswordRedirect() {
  const router = useRouter();
  const { colors } = useTheme();
  const { passwordRecovery, markPasswordRecovery, signOut } = useAuthContext();
  const params = useLocalSearchParams<{ code?: string }>();
  const exchangeAttempted = useRef(false);

  // Extract an auth code from a URL string
  function extractCode(url: string): string | null {
    const match = url.match(/[?&]code=([^&#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  // Perform the PKCE code-for-session exchange
  async function doExchange(code: string) {
    if (exchangeAttempted.current) return;
    exchangeAttempted.current = true;

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Reset password code exchange failed:', error.message);
        await signOut();
        router.replace('/(game)');
        return;
      }
      markPasswordRecovery();
    } catch (err) {
      console.error('Reset password code exchange threw:', err);
      await signOut();
      router.replace('/(game)');
    }
  }

  // Try to get the auth code from Expo Router params first, then from the
  // Linking API as a fallback (Expo Router sometimes strips query params on
  // iOS for custom URL scheme deep links).
  useEffect(() => {
    if (exchangeAttempted.current) return;

    // 1. Try Expo Router search params
    if (params.code) {
      doExchange(params.code);
      return;
    }

    // 2. Fallback: read the deep link URL directly via Linking API
    Linking.getInitialURL().then((url) => {
      if (exchangeAttempted.current) return;
      if (url) {
        const code = extractCode(url);
        if (code) {
          doExchange(code);
          return;
        }
      }
      console.warn('Reset password: no auth code found in params or initial URL');
    });

    // 3. Also listen for incoming URLs (app was already open / foreground)
    const sub = Linking.addEventListener('url', (event) => {
      if (exchangeAttempted.current) return;
      const code = extractCode(event.url);
      if (code) {
        doExchange(code);
      }
    });

    return () => sub.remove();
  }, [params.code]);

  // Redirect once recovery mode is confirmed
  useEffect(() => {
    if (passwordRecovery) {
      router.replace('/(game)');
    }
  }, [passwordRecovery]);

  // Safety fallback: if the exchange hangs or something unexpected happens,
  // sign out and redirect so the user isn't stranded on a blank spinner.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!passwordRecovery) {
        console.warn('Reset password: timed out waiting for code exchange');
        signOut().then(() => router.replace('/(game)'));
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [passwordRecovery]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
