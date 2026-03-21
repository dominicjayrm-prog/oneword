import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuthContext } from '../src/contexts/AuthContext';

/**
 * This route catches the `oneword://reset-password` deep link from the
 * password-reset email. The auth-code exchange and passwordRecovery flag
 * are handled by AuthContext's deep link listener. We wait for the exchange
 * to complete (passwordRecovery becomes true) before redirecting to the
 * game screen, which renders the "Set new password" form.
 */
export default function ResetPasswordRedirect() {
  const router = useRouter();
  const { colors } = useTheme();
  const { passwordRecovery } = useAuthContext();

  // Redirect once the code exchange has completed and recovery mode is set
  useEffect(() => {
    if (passwordRecovery) {
      router.replace('/(game)');
    }
  }, [passwordRecovery]);

  // Safety fallback: if the exchange takes too long or fails, redirect
  // after 10 seconds so the user isn't stuck on a blank spinner forever
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
