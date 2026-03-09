import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useGameContext } from '../../src/contexts/GameContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { WordDisplay } from '../../src/components/WordDisplay';
import { WordCounter } from '../../src/components/WordCounter';
import { Button } from '../../src/components/Button';
import { ThemeToggle } from '../../src/components/ThemeToggle';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { useToast } from '../../src/components/Toast';
import { fontSize, spacing, borderRadius } from '../../src/constants/theme';
import { haptic } from '../../src/lib/haptics';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session, profile, loading: authLoading, signIn, signUp, language, updateLanguage, pendingVerification, resendVerification, clearPendingVerification, passwordRecovery, resetPassword, updatePassword } = useAuthContext();
  const { todayWord, hasSubmitted, userDescription, loading: gameLoading, loadError: gameError, submitDescription, refresh } = useGameContext();

  const { showToast } = useToast();

  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading2, setAuthLoading2] = useState(false);
  const [selectedLang, setSelectedLang] = useState(language);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  const resentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (resentTimerRef.current) clearTimeout(resentTimerRef.current);
    };
  }, []);

  const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
  const isExactlyFive = wordCount === 5;
  const prevWordCount = useRef(0);

  useEffect(() => {
    if (wordCount > 0 && wordCount <= 5 && wordCount > prevWordCount.current) {
      haptic.light();
    }
    if (wordCount === 5 && prevWordCount.current !== 5) {
      haptic.success();
    }
    prevWordCount.current = wordCount;
  }, [wordCount]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const loading = authLoading || gameLoading;

  async function handleSubmit() {
    if (!isExactlyFive || submitting) return;
    haptic.heavy();
    setSubmitting(true);
    try {
      const { error } = await submitDescription(input);
      if (error) {
        showToast(error.message, 'error');
        setSubmitting(false);
      }
    } catch {
      showToast(t('errors.submit_failed'), 'error');
      setSubmitting(false);
    }
  }

  function validateAuth(): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return t('errors.invalid_email');
    if (password.length < 6) return t('errors.password_short');
    if (authMode === 'signup') {
      if (username.length < 3 || username.length > 20) return t('errors.username_length');
      if (!/^[a-zA-Z0-9_]+$/.test(username)) return t('errors.username_format');
    }
    return null;
  }

  async function handleAuth() {
    setAuthError('');
    const validationError = validateAuth();
    if (validationError) {
      setAuthError(validationError);
      return;
    }
    if (authLoading2) return;
    setAuthLoading2(true);
    try {
      if (authMode === 'signup') {
        const { error } = await signUp(email, password, username, selectedLang);
        if (error) setAuthError(error.message);
        else setShowAuth(false);
      } else {
        const { error } = await signIn(email, password);
        if (error) setAuthError(error.message);
        else setShowAuth(false);
      }
    } catch {
      setAuthError(t('errors.network_retry'));
    } finally {
      setAuthLoading2(false);
    }
  }

  async function handleResend() {
    if (resending) return;
    setResending(true);
    await resendVerification();
    setResending(false);
    setResent(true);
    if (resentTimerRef.current) clearTimeout(resentTimerRef.current);
    resentTimerRef.current = setTimeout(() => setResent(false), 3000);
  }

  async function handleForgotPassword() {
    setResetError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setResetError(t('errors.invalid_email'));
      return;
    }
    setResetLoading(true);
    const { error } = await resetPassword(resetEmail);
    setResetLoading(false);
    if (error) {
      setResetError(error.message);
    } else {
      setResetSent(true);
    }
  }

  async function handleSetNewPassword() {
    setResetError('');
    if (newPassword.length < 6) {
      setResetError(t('errors.password_short'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError(t('auth.passwords_no_match'));
      return;
    }
    setResetLoading(true);
    const { error } = await updatePassword(newPassword);
    setResetLoading(false);
    if (error) {
      setResetError(error.message);
    } else {
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  function handleLangSwitch(lang: string) {
    setSelectedLang(lang);
    updateLanguage(lang);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <LoadingSpinner message={t('loading.word')} />
      </View>
    );
  }

  if (gameError && session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemeToggle />
        <ErrorState
          title={t('errors.load_word')}
          message={t('errors.network_retry')}
          onRetry={refresh}
        />
      </View>
    );
  }

  // User clicked the reset link in email — show "Set new password" form
  if (passwordRecovery) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ThemeToggle />
        <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.verifyEmoji}>{'\uD83D\uDD12'}</Text>
          <Text style={[styles.verifyTitle, { color: colors.text }]}>{t('auth.new_password_title')}</Text>
          <Text style={[styles.verifySubtitle, { color: colors.textSecondary }]}>{t('auth.new_password_subtitle')}</Text>
          <View style={styles.authForm}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder={t('auth.new_password')}
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder={t('auth.confirm_password')}
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            {resetError ? <Text style={[styles.error, { color: colors.error }]}>{resetError}</Text> : null}
            <Button
              title={t('auth.set_password')}
              onPress={handleSetNewPassword}
              loading={resetLoading}
              disabled={!newPassword || !confirmPassword}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (pendingVerification) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemeToggle />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={styles.verifyEmoji}>{'\u2709\uFE0F'}</Text>
          <Text style={[styles.verifyTitle, { color: colors.text }]}>{t('auth.verify_title')}</Text>
          <Text style={[styles.verifySubtitle, { color: colors.textSecondary }]}>
            {t('auth.verify_subtitle', { email: pendingVerification })}
          </Text>
          <View style={styles.verifyActions}>
            <Button
              title={resent ? t('auth.verify_resent') : t('auth.verify_resend')}
              onPress={handleResend}
              loading={resending}
              disabled={resent}
              variant="outline"
            />
            <Button
              title={t('auth.verify_back')}
              onPress={() => clearPendingVerification()}
              variant="outline"
            />
          </View>
        </View>
      </View>
    );
  }

  if (!session || showAuth) {
    // "Reset link sent" confirmation screen
    if (resetSent) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ThemeToggle />
          <View style={[styles.center, { backgroundColor: colors.background }]}>
            <Text style={styles.verifyEmoji}>{'\u2709\uFE0F'}</Text>
            <Text style={[styles.verifyTitle, { color: colors.text }]}>{t('auth.reset_sent_title')}</Text>
            <Text style={[styles.verifySubtitle, { color: colors.textSecondary }]}>
              {t('auth.reset_sent_subtitle', { email: resetEmail })}
            </Text>
            <View style={styles.verifyActions}>
              <Button
                title={t('auth.verify_back')}
                onPress={() => { setResetSent(false); setForgotMode(false); setResetEmail(''); }}
                variant="outline"
              />
            </View>
          </View>
        </View>
      );
    }

    // "Forgot password" email entry screen
    if (forgotMode) {
      return (
        <KeyboardAvoidingView
          style={[styles.container, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ThemeToggle />
          <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
            <Text style={styles.verifyEmoji}>{'\uD83D\uDD11'}</Text>
            <Text style={[styles.verifyTitle, { color: colors.text }]}>{t('auth.forgot_title')}</Text>
            <Text style={[styles.verifySubtitle, { color: colors.textSecondary }]}>{t('auth.forgot_subtitle')}</Text>
            <View style={styles.authForm}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder={t('auth.signup_email')}
                placeholderTextColor={colors.textMuted}
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {resetError ? <Text style={[styles.error, { color: colors.error }]}>{resetError}</Text> : null}
              <Button
                title={t('auth.forgot_send')}
                onPress={handleForgotPassword}
                loading={resetLoading}
                disabled={!resetEmail}
              />
              <Button
                title={t('auth.verify_back')}
                onPress={() => { setForgotMode(false); setResetError(''); }}
                variant="outline"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ThemeToggle />
        <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.logoRow}>
            <Text style={[styles.logo, { color: colors.text }]}>one</Text>
            <Text style={[styles.logoWord, { color: colors.primary }]}>word</Text>
          </View>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>{t('auth.tagline')}</Text>

          <View style={styles.authForm}>
            {authMode === 'signup' && (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder={t('auth.signup_username')}
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            )}
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder={t('auth.signup_email')}
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder={t('auth.signup_password')}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {/* Language selector on signup */}
            {authMode === 'signup' && (
              <View style={styles.langSection}>
                <Text style={[styles.langLabel, { color: colors.textSecondary }]}>{t('auth.language_label')}</Text>
                <View style={styles.langRow}>
                  <TouchableOpacity
                    style={[
                      styles.langPill,
                      { borderColor: colors.primary },
                      selectedLang === 'en' && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handleLangSwitch('en')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.langPillText, selectedLang === 'en' ? { color: '#FFF' } : { color: colors.primary }]}>
                      English
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.langPill,
                      { borderColor: colors.primary },
                      selectedLang === 'es' && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handleLangSwitch('es')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.langPillText, selectedLang === 'es' ? { color: '#FFF' } : { color: colors.primary }]}>
                      Espa{'\u00F1'}ol
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {authError ? <Text style={[styles.error, { color: colors.error }]}>{authError}</Text> : null}

            <Button
              title={authMode === 'signin' ? t('auth.login_button') : t('auth.signup_button')}
              onPress={handleAuth}
              loading={authLoading2}
              disabled={!email || !password || (authMode === 'signup' && !username)}
            />
            {authMode === 'signin' && (
              <TouchableOpacity onPress={() => setForgotMode(true)} activeOpacity={0.7}>
                <Text style={[styles.forgotLink, { color: colors.primary }]}>{t('auth.forgot_link')}</Text>
              </TouchableOpacity>
            )}
            <Button
              title={authMode === 'signin' ? t('auth.login_link') : t('auth.signup_link')}
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
        <EmptyState
          emoji={'\uD83D\uDCC5'}
          title={t('empty.no_word')}
          subtitle={t('empty.no_word_sub')}
        />
      </View>
    );
  }

  if (hasSubmitted) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <ThemeToggle />
        <TouchableOpacity style={styles.header} onPress={() => { haptic.light(); router.push('/profile'); }} activeOpacity={0.7}>
          <View style={[styles.avatarSmall, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}>
            <Text style={styles.avatarSmallText}>{profile?.avatar_url || '\uD83C\uDFAD'}</Text>
          </View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{t('game.greeting', { username: profile?.username ?? 'player' })}</Text>
          {profile && profile.current_streak > 0 && (
            <Text style={[styles.streak, { color: colors.primary }]}>
              {t('game.day_streak', { count: profile.current_streak })}
            </Text>
          )}
        </TouchableOpacity>

        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <WordDisplay word={todayWord.word} category={todayWord.category} />
          <Text style={[styles.submittedLabel, { color: colors.textMuted }]}>{t('game.your_description')}</Text>
          <Text style={[styles.submittedText, { color: colors.text }]}>{userDescription}</Text>
          <View style={[styles.submittedCheck, { backgroundColor: colors.success + '20' }]}>
            <Text style={[styles.checkmark, { color: colors.success }]}>{t('game.locked_in')}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button title={t('game.vote_others')} onPress={() => { haptic.medium(); router.push('/vote'); }} />
          <Button title={t('game.see_results')} onPress={() => { haptic.medium(); router.push('/results'); }} variant="outline" />
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ThemeToggle />
      <TouchableOpacity style={styles.header} onPress={() => { haptic.light(); router.push('/profile'); }} activeOpacity={0.7}>
        <View style={[styles.avatarSmall, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}>
          <Text style={styles.avatarSmallText}>{profile?.avatar_url || '\uD83C\uDFAD'}</Text>
        </View>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>{t('game.greeting', { username: profile?.username ?? 'player' })}</Text>
        <Text style={[styles.todayLabel, { color: colors.textMuted }]}>{t('game.todays_word')}</Text>
      </TouchableOpacity>

      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <WordDisplay word={todayWord.word} category={todayWord.category} />
      </View>

      <View style={styles.inputSection}>
        <Text style={[styles.prompt, { color: colors.textSecondary }]}>{t('game.prompt')}</Text>
        <TextInput
          style={[styles.descriptionInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder={t('game.placeholder')}
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          autoFocus
          maxLength={200}
        />
        <WordCounter count={wordCount} max={5} />
        <Button
          title={submitting ? t('loading.submitting') : t('game.submit')}
          onPress={handleSubmit}
          disabled={!isExactlyFive || submitting}
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
    paddingTop: spacing.xxl,
  },
  scrollContent: {
    flexGrow: 1,
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
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarSmallText: {
    fontSize: 18,
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
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  logo: {
    fontSize: 48,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  logoWord: {
    fontSize: 48,
    fontFamily: 'PlayfairDisplay_700Bold',
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
  langSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  langLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  langRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  langPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 2,
  },
  langPillText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
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
    marginTop: spacing.md,
  },
  submittedText: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  submittedCheck: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  checkmark: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  noWord: {
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  noWordSub: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
  forgotLink: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  verifyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  verifyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  verifySubtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  verifyActions: {
    gap: spacing.sm,
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
});
