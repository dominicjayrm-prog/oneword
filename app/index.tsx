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
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { session, profile, loading: authLoading, signIn, signUp, language, updateLanguage } = useAuthContext();
  const { todayWord, hasSubmitted, userDescription, loading: gameLoading, submitDescription } = useGameContext();

  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [selectedLang, setSelectedLang] = useState(language);

  const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
  const isExactlyFive = wordCount === 5;

  const loading = authLoading || gameLoading;

  async function handleSubmit() {
    if (!isExactlyFive) return;
    setSubmitting(true);
    const { error } = await submitDescription(input);
    if (error) {
      if (Platform.OS === 'web') {
        window.alert(error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    }
    setSubmitting(false);
  }

  async function handleAuth() {
    setAuthError('');
    if (authMode === 'signup') {
      const { error } = await signUp(email, password, username, selectedLang);
      if (error) setAuthError(error.message);
      else setShowAuth(false);
    } else {
      const { error } = await signIn(email, password);
      if (error) setAuthError(error.message);
      else setShowAuth(false);
    }
  }

  function handleLangSwitch(lang: string) {
    setSelectedLang(lang);
    updateLanguage(lang);
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
            />
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
        <Text style={[styles.noWord, { color: colors.text }]}>{t('game.no_word')}</Text>
        <Text style={[styles.noWordSub, { color: colors.textSecondary }]}>{t('game.no_word_sub')}</Text>
      </View>
    );
  }

  if (hasSubmitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemeToggle />
        <TouchableOpacity style={styles.header} onPress={() => router.push('/profile')} activeOpacity={0.7}>
          <View style={[styles.avatarSmall, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}>
            <Text style={styles.avatarSmallText}>{profile?.avatar_url || '\uD83C\uDFAD'}</Text>
          </View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Hi, {profile?.username ?? 'player'}</Text>
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
          <Button title={t('game.vote_others')} onPress={() => router.push('/vote')} />
          <Button title={t('game.see_results')} onPress={() => router.push('/results')} variant="outline" />
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
      <TouchableOpacity style={styles.header} onPress={() => router.push('/profile')} activeOpacity={0.7}>
        <View style={[styles.avatarSmall, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}>
          <Text style={styles.avatarSmallText}>{profile?.avatar_url || '\uD83C\uDFAD'}</Text>
        </View>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>Hi, {profile?.username ?? 'player'}</Text>
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
          title={t('game.submit')}
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
    paddingTop: spacing.xxl,
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
});
