import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuthContext } from '../src/contexts/AuthContext';
import { supabase } from '../src/lib/supabase';

/**
 * This route catches the `oneword://reset-password#access_token=...&type=recovery`
 * deep link from the password-reset email (implicit flow). The AuthContext deep link
 * handler may also process the URL — this route acts as a fallback and waits for the
 * passwordRecovery flag before redirecting to the game screen.
 */
export default function ResetPasswordRedirect() {
  const router = useRouter();
  const { colors } = useTheme();
  const { passwordRecovery, markPasswordRecovery, signOut } = useAuthContext();
  const sessionAttempted = useRef(false);

  // Fallback: if handleDeepLink in AuthContext didn't fire (Expo Router can
  // consume the deep link before the Linking API delivers it), try to extract
  // tokens from the URL ourselves.
  useEffect(() => {
    if (sessionAttempted.current || passwordRecovery) return;

    async function trySetSessionFromURL(url: string) {
      if (sessionAttempted.current) return;
      const hashIndex = url.indexOf('#');
      if (hashIndex === -1) return;

      const params = new URLSearchParams(url.substring(hashIndex + 1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (accessToken && refreshToken) {
        sessionAttempted.current = true;
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error && type === 'recovery') {
          markPasswordRecovery();
        } else if (error) {
          console.error('Reset password setSession failed:', error.message);
        }
      }
    }

    // Try initial URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) trySetSessionFromURL(url);
    });

    // Listen for URL events (app was already open)
    const sub = Linking.addEventListener('url', (event) => {
      trySetSessionFromURL(event.url);
    });

    return () => sub.remove();
  }, [passwordRecovery]);

  // Redirect once recovery mode is confirmed
  useEffect(() => {
    if (passwordRecovery) {
      router.replace('/(game)');
    }
  }, [passwordRecovery]);

  // Safety fallback: if nothing worked after 15s, redirect to login.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!passwordRecovery) {
        console.warn('Reset password: timed out waiting for session');
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
