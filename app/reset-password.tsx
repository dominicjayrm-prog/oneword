import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';

/**
 * This route exists solely to catch the `oneword://reset-password` deep link
 * that Supabase sends in the password-reset email. The actual auth-code
 * exchange and PASSWORD_RECOVERY event are handled by AuthContext's Linking
 * listener, so all we need to do here is redirect to the game screen where
 * the "Set new password" UI is rendered when `auth.passwordRecovery` is true.
 */
export default function ResetPasswordRedirect() {
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    // Small delay to let AuthContext process the deep link code first
    const timer = setTimeout(() => {
      router.replace('/(game)');
    }, 100);
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
