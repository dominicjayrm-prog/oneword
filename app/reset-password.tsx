import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuthContext } from '../src/contexts/AuthContext';
import { supabase } from '../src/lib/supabase';

/**
 * This route catches the `oneword://reset-password?code=AUTH_CODE` deep link
 * from the password-reset email. On iOS, the Linking API may not deliver the
 * URL to AuthContext's deep link handler (Expo Router consumes the deep link
 * for routing), so we handle the code exchange directly here using the query
 * params provided by Expo Router.
 */
export default function ResetPasswordRedirect() {
  const router = useRouter();
  const { colors } = useTheme();
  const { passwordRecovery, markPasswordRecovery, signOut } = useAuthContext();
  const params = useLocalSearchParams<{ code?: string }>();
  const exchangeAttempted = useRef(false);

  // Exchange the auth code for a session and flag recovery mode
  useEffect(() => {
    const code = params.code;
    if (!code || exchangeAttempted.current) return;
    exchangeAttempted.current = true;

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          console.error('Reset password code exchange failed:', error.message);
          // Exchange failed — no recovery session exists. Sign out any stale
          // session so the user lands on the login screen, not inside the game.
          signOut().then(() => router.replace('/(game)'));
          return;
        }
        markPasswordRecovery();
      })
      .catch((err) => {
        console.error('Reset password code exchange threw:', err);
        signOut().then(() => router.replace('/(game)'));
      });
  }, [params.code]);

  // Redirect once recovery mode is confirmed
  useEffect(() => {
    if (passwordRecovery) {
      router.replace('/(game)');
    }
  }, [passwordRecovery]);

  // Safety fallback: if the exchange hangs or something unexpected happens,
  // sign out and redirect so the user isn't stranded on a blank spinner.
  // They'll land on the login screen and can request a new reset link.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!passwordRecovery) {
        signOut().then(() => router.replace('/(game)'));
      }
    }, 10000);
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
