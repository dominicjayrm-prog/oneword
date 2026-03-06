import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../src/contexts/AuthContext';
import { useGameContext } from '../src/contexts/GameContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { WordDisplay } from '../src/components/WordDisplay';
import { WordCounter } from '../src/components/WordCounter';
import { Button } from '../src/components/Button';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { fontSize, spacing, borderRadius } from '../src/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { session, profile, loading: authLoading, signIn, signUp, signOut } = useAuthContext();
  const { todayWord, hasSubmitted, userDescription, loading: gameLoading, submitDescription } = useGameContext();

  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');

  const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
  const isExactlyFive = wordCount === 5;

  const loading = authLoading || gameLoading;

  async function handleSubmit() {
    if (!isExactlyFive) return;
    setSubmitting(true);
    const { error } = await submitDescription(input);
    if (error) {
      Alert.alert('Error', error.message);
    }
    setSubmitting(false);
  }

  async function handleAuth() {
    setAuthError('');
    if (authMode === 'signup') {
      const { error } = await signUp(email, password, username);
      if (error) setAuthError(error.message);
      else setShowAuth(false);
    } else {
      const { error } = await signIn(email, password);
      if (error) setAuthError(error.message);
      else setShowAuth(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session || showAuth) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ThemeToggle />
        <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
          <Text style={[styles.logo, { color: colors.text }]}>ONE</Text>
          <Text style={[styles.logoWord, { color: colors.primary }]}>WORD</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>5 words. 1 winner. Every day.</Text>

          <View style={styles.authForm}>
            {authMode === 'signup' && (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Username"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            )}
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {authError ? <Text style={[styles.error, { color: colors.error }]}>{authError}</Text> : null}

            <Button
              title={authMode === 'signin' ? 'Sign In' : 'Create Account'}
              onPress={handleAuth}
            />
            <Button
              title={authMode === 'signin' ? 'Need an account? Sign Up' : 'Have an account? Sign In'}
              onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              variant="outline"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (!todayWord) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ThemeToggle />
        <Text style={[styles.noWord, { color: colors.text }]}>No word for today yet.</Text>
        <Text style={[styles.noWordSub, { color: colors.textSecondary }]}>Check back soon!</Text>
      </View>
    );
  }

  if (hasSubmitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemeToggle />
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Hi, {profile?.username ?? 'player'}</Text>
          {profile && profile.current_streak > 0 && (
            <Text style={[styles.streak, { color: colors.primary }]}>
              {profile.current_streak} day streak
            </Text>
          )}
        </View>

        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <WordDisplay word={todayWord.word} category={todayWord.category} />
          <Text style={[styles.submittedLabel, { color: colors.textMuted }]}>YOUR DESCRIPTION</Text>
          <Text style={[styles.submittedText, { color: colors.text }]}>{userDescription}</Text>
          <View style={[styles.submittedCheck, { backgroundColor: colors.success + '20' }]}>
            <Text style={[styles.checkmark, { color: colors.success }]}>Locked in</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button title="VOTE ON OTHERS" onPress={() => router.push('/vote')} />
          <Button title="SEE RESULTS" onPress={() => router.push('/results')} variant="outline" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ThemeToggle />
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>Hi, {profile?.username ?? 'player'}</Text>
        <Text style={[styles.todayLabel, { color: colors.textMuted }]}>TODAY'S WORD</Text>
      </View>

      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <WordDisplay word={todayWord.word} category={todayWord.category} />
      </View>

      <View style={styles.inputSection}>
        <Text style={[styles.prompt, { color: colors.textSecondary }]}>Describe it in exactly 5 words</Text>
        <TextInput
          style={[styles.descriptionInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="Type your five words..."
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          autoFocus
          maxLength={200}
        />
        <WordCounter count={wordCount} max={5} />
        <Button
          title="LOCK IT IN"
          onPress={handleSubmit}
          disabled={!isExactlyFive}
          loading={submitting}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greeting: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  streak: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  todayLabel: {
    fontSize: fontSize.xs,
    letterSpacing: 3,
    marginTop: spacing.sm,
  },
  logo: {
    fontSize: 64,
    fontWeight: '200',
    letterSpacing: 12,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  logoWord: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: 12,
    textAlign: 'center',
    marginTop: -10,
  },
  tagline: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  authForm: {
    gap: spacing.md,
  },
  input: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    borderWidth: 1,
  },
  error: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  inputSection: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  prompt: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  descriptionInput: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: fontSize.xl,
    textAlign: 'center',
    minHeight: 80,
    borderWidth: 1,
  },
  submittedLabel: {
    fontSize: fontSize.xs,
    letterSpacing: 3,
    marginTop: spacing.xl,
  },
  submittedText: {
    fontSize: fontSize.xl,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  submittedCheck: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  checkmark: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  noWord: {
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  noWordSub: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
});
