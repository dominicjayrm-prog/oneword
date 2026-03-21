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
  const { passwordRecovery, markPasswordRecovery } = useAuthContext();
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
          // Even on error, redirect to game — the user might already have a
          // session and the deep link handler in AuthContext may have handled it.
          router.replace('/(game)');
          return;
        }
        markPasswordRecovery();
      })
      .catch((err) => {
        console.error('Reset password code exchange threw:', err);
        router.replace('/(game)');
      });
  }, [params.code]);

  // Redirect once recovery mode is confirmed
  useEffect(() => {
    if (passwordRecovery) {
      router.replace('/(game)');
    }
  }, [passwordRecovery]);

  // Safety fallback: if everything fails, don't strand the user on a spinner
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(game)');
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

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
