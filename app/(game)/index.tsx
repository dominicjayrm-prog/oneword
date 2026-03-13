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
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { YesterdayWinnerCard } from '../../src/components/YesterdayWinnerCard';
import { WeeklyRecapCard } from '../../src/components/WeeklyRecap';
import { StreakCelebration } from '../../src/components/StreakCelebration';
import { FirstSubmitCelebration } from '../../src/components/FirstSubmitCelebration';
import { BadgePill } from '../../src/components/BadgePill';
import { useToast } from '../../src/components/Toast';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { fontSize, spacing, borderRadius, withOpacity } from '../../src/constants/theme';
import {
  DESCRIPTION_WORD_COUNT,
  DESCRIPTION_MAX_LENGTH,
  TOAST_DURATION_MS,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../src/constants/app';
import { validateUsername } from '../../src/lib/usernameValidator';
import { haptic } from '../../src/lib/haptics';
import { getGameDate, getGameDay, getGameMonday, msUntilNextWord } from '../../src/lib/gameDate';
import { getCurrentBadge, type BadgeTier } from '../../src/lib/badges';
import { supabase } from '../../src/lib/supabase';
import {
  setBadgeCount,
  cancelStreakRisk,
  scheduleDailyReminder,
  scheduleStreakRisk,
  triggerMilestoneNotification,
  parseTimeString,
} from '../../src/lib/notifications';
import {
  NotificationPermissionPrompt,
  shouldShowNotificationPrompt,
} from '../../src/components/NotificationPermissionPrompt';
import type { YesterdayWinner, WeeklyRecap } from '../../src/types/database';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const auth = useAuthContext();
  const {
    todayWord,
    hasSubmitted,
    userDescription,
    loading: gameLoading,
    loadError: gameError,
    submitDescription,
    getYesterdayWinner,
    getWeeklyRecap,
    refresh,
  } = useGameContext();
  const { isOnline } = useNetwork();

  const { showToast } = useToast();

  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showWeeklyRecap, setShowWeeklyRecap] = useState(false);
  const [recapData, setRecapData] = useState<WeeklyRecap | null>(null);
  const [showYesterdayWinner, setShowYesterdayWinner] = useState(false);
  const [yesterdayData, setYesterdayData] = useState<YesterdayWinner | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [selectedLang, setSelectedLang] = useState(auth.language);
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
  const [celebrationBadge, setCelebrationBadge] = useState<BadgeTier | null>(null);
  const [celebrationStreak, setCelebrationStreak] = useState(0);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [showFirstSubmitCelebration, setShowFirstSubmitCelebration] = useState(false);
  const [firstSubmitSubmitting, setFirstSubmitSubmitting] = useState(false);
  const [firstSubmitDescription, setFirstSubmitDescription] = useState('');
  const [countdown, setCountdown] = useState('');

  const resentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  // Guard against double-tap race condition (React state batching means
  // `submitting` may not update before a second tap fires).
  const submitGuardRef = useRef(false);

  // Keep stable refs to the callbacks so the interstitial effect doesn't
  // restart every time userId/language changes recreate these functions.
  const getWeeklyRecapRef = useRef(getWeeklyRecap);
  getWeeklyRecapRef.current = getWeeklyRecap;
  const getYesterdayWinnerRef = useRef(getYesterdayWinner);
  getYesterdayWinnerRef.current = getYesterdayWinner;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (resentTimerRef.current) clearTimeout(resentTimerRef.current);
    };
  }, []);

  // Live countdown to next word rollover (5am UTC)
  useEffect(() => {
    if (!hasSubmitted) return;
    function tick() {
      const ms = msUntilNextWord();
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) {
        setCountdown(`${h}h ${m}m`);
      } else if (m > 0) {
        setCountdown(`${m}m ${s}s`);
      } else {
        setCountdown(`${s}s`);
      }
    }
    tick();
    // Update every minute when > 1h away, every second when closer
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [hasSubmitted]);

  // Fetch interstitial cards (recap + winner) once per mount when conditions are met.
  // Uses a ref guard instead of the effect cleanup's `cancelled` flag, because
  // auth.profile can change reference multiple times during login (fetchProfile runs
  // from both getSession and onAuthStateChange), which would cancel in-flight fetches.
  const interstitialStartedRef = useRef(false);
  // Capture the user's total_plays when their profile first loads this session.
  // This prevents post-submission profile refreshes (total_plays 0→1) from
  // triggering the yesterday-winner interstitial for first-time users.
  const initialTotalPlaysRef = useRef<number | null>(null);
  // Track the session user ID so we can detect account switches (not just logout).
  const prevSessionUserRef = useRef<string | null>(null);
  // Reset interstitial guards AND component state on logout or account switch
  // so a new user never inherits stale yesterday-winner / recap data.
  useEffect(() => {
    const currentUserId = auth.session?.user?.id ?? null;
    if (currentUserId !== prevSessionUserRef.current) {
      // User changed (logout, login as different user, or first load)
      interstitialStartedRef.current = false;
      initialTotalPlaysRef.current = null;
      // Reset interstitial component state so a new user doesn't inherit
      // stale yesterday-winner or recap data from the previous session.
      setShowYesterdayWinner(false);
      setYesterdayData(null);
      setShowWeeklyRecap(false);
      setRecapData(null);
      prevSessionUserRef.current = currentUserId;
    }
  }, [auth.session]);
  useEffect(() => {
    if (auth.profile && initialTotalPlaysRef.current === null) {
      initialTotalPlaysRef.current = auth.profile.total_plays ?? 0;
    }
  }, [auth.profile]);
  useEffect(() => {
    if (!auth.session || !auth.profile || gameLoading) return;
    if (interstitialStartedRef.current) return;
    interstitialStartedRef.current = true;

    const userId = auth.session.user.id;
    (async () => {
      try {
        const gameDateStr = getGameDate();

        // Fetch server-side dismissal state (works across devices)
        const { data: dismissals } = await supabase.rpc('get_dismissals', {
          p_user_id: userId,
        });
        const d = dismissals && dismissals.length > 0 ? dismissals[0] : null;

        if (!mountedRef.current) return;

        // Check recap first (Mondays only, based on game day)
        if (getGameDay() === 1) {
          const thisMonday = getGameMonday(gameDateStr);
          if (d?.recap_dismissed_week !== thisMonday) {
            const recap = await getWeeklyRecapRef.current();
            if (!mountedRef.current) return;
            if (recap) {
              setRecapData(recap);
              setShowWeeklyRecap(true);
            }
          }
        }

        // Always pre-fetch yesterday's winner (won't display until recap is dismissed)
        // Don't show to brand-new users who haven't played yet.
        // Use the initial total_plays snapshot so that a first-time submission
        // (which bumps total_plays 0→1 and refreshes the profile) doesn't
        // retroactively trigger the yesterday-winner card on the same day.
        // Also guard against accounts created today — even if total_plays is
        // somehow > 0, a user shouldn't see yesterday's winner on sign-up day.
        const hasPlayed = initialTotalPlaysRef.current !== null && initialTotalPlaysRef.current > 0;
        const createdToday = auth.profile?.created_at ? auth.profile.created_at.startsWith(gameDateStr) : false;
        if (hasPlayed && !createdToday && d?.winner_dismissed_date !== gameDateStr) {
          const winner = await getYesterdayWinnerRef.current();
          if (!mountedRef.current) return;
          if (__DEV__) {
            console.log(
              '[Interstitial] gameDate:',
              gameDateStr,
              'lastDismissed:',
              d?.winner_dismissed_date,
              'winner:',
              winner,
            );
          }
          if (winner) {
            setYesterdayData(winner);
            setShowYesterdayWinner(true);
          }
        } else if (__DEV__) {
          console.log('[Interstitial] Yesterday winner already dismissed for', gameDateStr);
        }
      } catch (err) {
        // Non-critical — just skip interstitial cards.
        // Don't reset interstitialStartedRef here: a profile refresh (e.g. after
        // first submission) would re-trigger the effect and could show yesterday's
        // winner to a first-time user whose total_plays just went from 0 to 1.
        // The interstitial will retry on next app mount / session change instead.
        console.warn('[HomeScreen] Interstitial fetch failed:', err);
      }
    })();
  }, [auth.session, auth.profile, gameLoading]);

  // Set/clear app badge based on whether the user has played today
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!auth.session || gameLoading) return;
    setBadgeCount(hasSubmitted ? 0 : 1);
  }, [auth.session, gameLoading, hasSubmitted]);

  const dismissWeeklyRecap = useCallback(async () => {
    setShowWeeklyRecap(false);
    if (!auth.session) return;
    try {
      await supabase.rpc('set_dismissal', {
        p_user_id: auth.session.user.id,
        p_field: 'recap_dismissed_week',
        p_value: getGameMonday(),
      });
    } catch (err) {
      console.warn('[HomeScreen] Failed to dismiss weekly recap:', err);
    }
  }, [auth.session]);

  const dismissYesterdayWinner = useCallback(async () => {
    setShowYesterdayWinner(false);
    if (!auth.session) return;
    try {
      await supabase.rpc('set_dismissal', {
        p_user_id: auth.session.user.id,
        p_field: 'winner_dismissed_date',
        p_value: getGameDate(),
      });
    } catch (err) {
      console.warn('[HomeScreen] Failed to dismiss yesterday winner:', err);
    }
  }, [auth.session]);

  // Normalize Unicode whitespace (non-breaking space, em space, etc.) to regular spaces
  const wordCount = input
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const isExactlyFive = wordCount === DESCRIPTION_WORD_COUNT;
  const prevWordCount = useRef(0);

  useEffect(() => {
    if (wordCount > 0 && wordCount <= DESCRIPTION_WORD_COUNT && wordCount > prevWordCount.current) {
      haptic.light();
    }
    if (wordCount === DESCRIPTION_WORD_COUNT && prevWordCount.current !== DESCRIPTION_WORD_COUNT) {
      haptic.success();
    }
    prevWordCount.current = wordCount;
  }, [wordCount]);

  const onRefresh = useCallback(async () => {
    haptic.medium();
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const loading = auth.loading || gameLoading;

  async function handleSubmit() {
    if (!isExactlyFive || submitting || submitGuardRef.current) return;
    submitGuardRef.current = true;
    haptic.heavy();
    setSubmitting(true);

    // Check if this is the user's first-ever submission BEFORE submitting.
    // The key is scoped per-user so logging out and signing up as a different
    // user on the same device still triggers the celebration correctly.
    let isFirstSubmit = false;
    const userId = auth.session?.user?.id;
    try {
      const userKey = userId ? `@oneword_first_submit_celebrated_${userId}` : null;
      const celebrated = userKey ? await AsyncStorage.getItem(userKey) : null;
      // Show celebration if never celebrated AND user has no prior plays
      // (treat missing/null profile as first-time too — profile may be auto-created server-side)
      if (!celebrated && (!auth.profile || (auth.profile.total_plays ?? 0) === 0)) {
        isFirstSubmit = true;
      }
    } catch {
      // If AsyncStorage check fails, skip celebration
    }

    // If first submission, show the submitting stage
    if (isFirstSubmit) {
      setFirstSubmitDescription(input.trim().split(/\s+/).filter(Boolean).join(' '));
      setFirstSubmitSubmitting(true);
    }

    try {
      const { error, oldStreak, savedLocally } = await submitDescription(input);

      if (isFirstSubmit) {
        setFirstSubmitSubmitting(false);
      }

      if (error) {
        if (isFirstSubmit) {
          setFirstSubmitSubmitting(false);
          setShowFirstSubmitCelebration(false);
        }
        // If the description was saved locally (network failed after local save), show info toast
        if (savedLocally) {
          haptic.warning();
          showToast(t('offline.description_saved') + ' ' + t('offline.will_submit_when_online'), 'info');
        } else {
          showToast(error.message, 'error');
        }
      } else if (isFirstSubmit && oldStreak !== undefined) {
        // Show first submission celebration
        // Wait 800ms for the submitting stage, then show celebration
        setTimeout(async () => {
          if (mountedRef.current) {
            setShowFirstSubmitCelebration(true);
            try {
              if (userId) {
                await AsyncStorage.setItem(`@oneword_first_submit_celebrated_${userId}`, 'true');
              }
            } catch {
              // non-critical
            }
          }
        }, 800);

        // Still run post-submission notification logic
        if (Platform.OS !== 'web') {
          (async () => {
            try {
              await setBadgeCount(0);
              await cancelStreakRisk();
              if (auth.profile?.notify_daily) {
                const [h, m] = parseTimeString(auth.profile.notify_daily_time);
                await scheduleDailyReminder(h, m, t('notifications.daily_title'), t('notifications.daily_body'));
              }
              if (auth.profile?.notify_streak_risk) {
                await scheduleStreakRisk(
                  20,
                  0,
                  t('notifications.streak_risk_title'),
                  t('notifications.streak_risk_body'),
                );
              }
            } catch (err) {
              console.warn('[HomeScreen] Post-submit notification scheduling failed:', err);
            }
          })();
        }
      } else if (oldStreak !== undefined) {
        // Post-submission notification logic (non-blocking)
        if (Platform.OS !== 'web') {
          (async () => {
            try {
              // Clear badge and cancel today's streak risk
              await setBadgeCount(0);
              await cancelStreakRisk();

              // Reschedule tomorrow's daily reminder
              if (auth.profile?.notify_daily) {
                const [h, m] = parseTimeString(auth.profile.notify_daily_time);
                await scheduleDailyReminder(h, m, t('notifications.daily_title'), t('notifications.daily_body'));
              }
              // Reschedule streak risk for tomorrow evening
              if (auth.profile?.notify_streak_risk) {
                await scheduleStreakRisk(
                  20,
                  0,
                  t('notifications.streak_risk_title'),
                  t('notifications.streak_risk_body'),
                );
              }
            } catch (err) {
              console.warn('[HomeScreen] Post-submit notification scheduling failed:', err);
            }
          })();
        }

        // Check for milestone after successful submission
        const newStreak = oldStreak + 1;
        const oldBadge = getCurrentBadge(oldStreak);
        const newBadge = getCurrentBadge(newStreak);
        if (newBadge && (!oldBadge || newBadge.streak !== oldBadge.streak)) {
          // Check server-side to avoid re-showing across devices
          if (!auth.session) return;
          const { data: dismissals } = await supabase.rpc('get_dismissals', {
            p_user_id: auth.session.user.id,
          });
          const milestones = dismissals?.[0]?.milestones_shown ?? [];
          if (!milestones.includes(newBadge.streak)) {
            // Delay celebration 500ms after "locked in" appears
            setTimeout(() => {
              if (mountedRef.current) {
                setCelebrationStreak(newStreak);
                setCelebrationBadge(newBadge);
              }
            }, 500);
            await supabase.rpc('add_milestone_shown', {
              p_user_id: auth.session.user.id,
              p_streak: newBadge.streak,
            });
            // Also fire a local milestone notification
            if (Platform.OS !== 'web') {
              triggerMilestoneNotification(newBadge.emoji, newStreak, newBadge.name);
            }
          }
        }

        // Show notification permission prompt after first submission
        if (Platform.OS !== 'web' && !auth.profile?.notifications_enabled) {
          const shouldShow = await shouldShowNotificationPrompt();
          if (shouldShow) {
            setTimeout(() => {
              if (mountedRef.current) setShowNotifPrompt(true);
            }, 1500);
          }
        }
      }
    } catch {
      showToast(t('errors.submit_failed'), 'error');
    } finally {
      setSubmitting(false);
      submitGuardRef.current = false;
    }
  }

  function validateAuth(): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return t('errors.invalid_email');
    if (password.length < PASSWORD_MIN_LENGTH) return t('errors.password_short');
    if (authMode === 'signup') {
      const usernameError = validateUsername(username, USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH);
      if (usernameError) return t(usernameError);
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
    if (authSubmitting) return;
    setAuthSubmitting(true);
    try {
      if (authMode === 'signup') {
        const { error } = await auth.signUp(email, password, username, selectedLang);
        if (error) setAuthError(error.message);
        else setShowAuth(false);
      } else {
        const { error } = await auth.signIn(email, password);
        if (error) setAuthError(error.message);
        else setShowAuth(false);
      }
    } catch {
      setAuthError(t('errors.network_retry'));
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleResend() {
    if (resending) return;
    setResending(true);
    try {
      await auth.resendVerification();
      setResent(true);
      if (resentTimerRef.current) clearTimeout(resentTimerRef.current);
      resentTimerRef.current = setTimeout(() => setResent(false), TOAST_DURATION_MS);
    } catch {
      showToast(t('errors.network_retry'), 'error');
    } finally {
      setResending(false);
    }
  }

  async function handleForgotPassword() {
    setResetError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setResetError(t('errors.invalid_email'));
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await auth.resetPassword(resetEmail);
      if (error) {
        setResetError(error.message);
      } else {
        setResetSent(true);
      }
    } catch {
      setResetError(t('errors.network_retry'));
    } finally {
      setResetLoading(false);
    }
  }

  async function handleSetNewPassword() {
    setResetError('');
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setResetError(t('errors.password_short'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError(t('auth.passwords_no_match'));
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await auth.updatePassword(newPassword);
      if (error) {
        setResetError(error.message);
      } else {
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setResetError(t('errors.network_retry'));
    } finally {
      setResetLoading(false);
    }
  }

  function handleLangSwitch(lang: string) {
    setSelectedLang(lang);
    auth.updateLanguage(lang);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <LoadingSpinner message={t('loading.word')} />
      </View>
    );
  }

  if (gameError && auth.session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemeToggle />
        <ErrorState
          title={!isOnline ? t('offline.no_connection') : t('errors.load_word')}
          message={!isOnline ? t('offline.connect_for_word') : t('errors.network_retry')}
          onRetry={refresh}
        />
      </View>
    );
  }

  // User clicked the reset link in email — show "Set new password" form
  if (auth.passwordRecovery) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ThemeToggle />
        <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.verifyEmoji}>{'\uD83D\uDD12'}</Text>
          <Text style={[styles.verifyTitle, { color: colors.text }]}>{t('auth.new_password_title')}</Text>
          <Text style={[styles.verifySubtitle, { color: colors.textSecondary }]}>
            {t('auth.new_password_subtitle')}
          </Text>
          <View style={styles.authForm}>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder={t('auth.new_password')}
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
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

  if (auth.pendingVerification) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemeToggle />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={styles.verifyEmoji}>{'\u2709\uFE0F'}</Text>
          <Text style={[styles.verifyTitle, { color: colors.text }]}>{t('auth.verify_title')}</Text>
          <Text style={[styles.verifySubtitle, { color: colors.textSecondary }]}>
            {t('auth.verify_subtitle', { email: auth.pendingVerification })}
          </Text>
          <View style={styles.verifyActions}>
            <Button
              title={resent ? t('auth.verify_resent') : t('auth.verify_resend')}
              onPress={handleResend}
              loading={resending}
              disabled={resent}
              variant="outline"
            />
            <Button title={t('auth.verify_back')} onPress={() => auth.clearPendingVerification()} variant="outline" />
          </View>
        </View>
      </View>
    );
  }

  if (!auth.session || showAuth) {
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
                onPress={() => {
                  setResetSent(false);
                  setForgotMode(false);
                  setResetEmail('');
                }}
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
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
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
                onPress={() => {
                  setForgotMode(false);
                  setResetError('');
                }}
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
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                placeholder={t('auth.signup_username')}
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            )}
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder={t('auth.signup_email')}
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
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
                    <Text
                      style={[
                        styles.langPillText,
                        selectedLang === 'en' ? { color: '#FFF' } : { color: colors.primary },
                      ]}
                    >
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
                    <Text
                      style={[
                        styles.langPillText,
                        selectedLang === 'es' ? { color: '#FFF' } : { color: colors.primary },
                      ]}
                    >
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
              loading={authSubmitting}
              disabled={!email || !password || (authMode === 'signup' && !username)}
            />
            {authMode === 'signup' && (
              <Text style={[styles.legalText, { color: colors.textMuted }]}>
                {t('legal.agree_prefix')}
                <Text
                  style={{ color: colors.primary }}
                  onPress={() =>
                    router.push({
                      pathname: '/webview',
                      params: {
                        url:
                          selectedLang === 'es' ? 'https://playoneword.app/es/terms' : 'https://playoneword.app/terms',
                        title: t('legal.terms_of_use'),
                      },
                    })
                  }
                >
                  {t('legal.terms_of_use')}
                </Text>
                {t('legal.and')}
                <Text
                  style={{ color: colors.primary }}
                  onPress={() =>
                    router.push({
                      pathname: '/webview',
                      params: {
                        url:
                          selectedLang === 'es'
                            ? 'https://playoneword.app/es/privacy'
                            : 'https://playoneword.app/privacy',
                        title: t('legal.privacy_policy'),
                      },
                    })
                  }
                >
                  {t('legal.privacy_policy')}
                </Text>
              </Text>
            )}
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

  // Weekly Recap — shown on Mondays before everything else
  if (showWeeklyRecap && recapData) {
    return <WeeklyRecapCard data={recapData} onDismiss={dismissWeeklyRecap} />;
  }

  // First submission celebration — takes priority over yesterday's winner.
  // A new user who just submitted should see confetti, not the winner card.
  if (firstSubmitSubmitting || showFirstSubmitCelebration) {
    if (firstSubmitSubmitting && !showFirstSubmitCelebration) {
      // Stage 1: Submitting spinner
      return (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <LoadingSpinner message={t('firstSubmit.submitting')} />
        </View>
      );
    }
    // Stage 2: Celebration
    return (
      <FirstSubmitCelebration
        wordName={todayWord?.word ?? ''}
        category={todayWord?.category ?? ''}
        description={firstSubmitDescription}
        onVote={() => {
          setShowFirstSubmitCelebration(false);
          setFirstSubmitSubmitting(false);
          haptic.medium();
          router.push('/vote');
        }}
        onResults={() => {
          setShowFirstSubmitCelebration(false);
          setFirstSubmitSubmitting(false);
          haptic.medium();
          router.push('/results');
        }}
      />
    );
  }

  // Yesterday's Winner card — shown once per day before today's word
  if (showYesterdayWinner && yesterdayData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemeToggle />
        <YesterdayWinnerCard data={yesterdayData} onDismiss={dismissYesterdayWinner} />
      </View>
    );
  }

  if (!todayWord) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ThemeToggle />
        <EmptyState emoji={'\uD83D\uDCC5'} title={t('empty.no_word')} subtitle={t('empty.no_word_sub')} />
      </View>
    );
  }

  if (hasSubmitted) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <ThemeToggle />
        <TouchableOpacity
          style={styles.header}
          onPress={() => {
            haptic.light();
            router.push('/profile');
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.avatarSmall, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}>
            <Text style={styles.avatarSmallText}>{auth.profile?.avatar_url || '\uD83C\uDFAD'}</Text>
          </View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {t('game.greeting', { username: auth.profile?.username ?? 'player' })}
          </Text>
          {auth.profile && auth.profile.current_streak > 0 && (
            <View style={styles.streakRow}>
              <BadgePill streak={auth.profile.current_streak} />
              <Text style={[styles.streak, { color: colors.primary }]}>
                {t('game.day_streak', { count: auth.profile.current_streak })}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <WordDisplay word={todayWord.word} category={todayWord.category} />
          <Text style={[styles.submittedLabel, { color: colors.textMuted }]}>{t('game.your_description')}</Text>
          <Text style={[styles.submittedText, { color: colors.text }]}>{userDescription}</Text>
          <View style={[styles.submittedCheck, { backgroundColor: withOpacity(colors.success, 0.125) }]}>
            <Text style={[styles.checkmark, { color: colors.success }]}>{t('game.locked_in')}</Text>
          </View>
          {countdown ? (
            <Text style={[styles.countdownText, { color: colors.textMuted }]}>
              {t('game.next_word_in', { time: countdown })}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            title={t('game.vote_others')}
            onPress={() => {
              haptic.medium();
              router.push('/vote');
            }}
          />
          <Button
            title={t('game.see_results')}
            onPress={() => {
              haptic.medium();
              router.push('/results');
            }}
            variant="outline"
          />
          <TouchableOpacity
            style={styles.shareDescLink}
            onPress={async () => {
              haptic.medium();
              try {
                await Share.share({
                  message: t('game.share_description_message', {
                    word: todayWord.word,
                    description: userDescription ?? '',
                  }),
                });
              } catch {
                // User cancelled or share failed
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.shareDescText, { color: colors.primary }]}>{t('game.share_description')}</Text>
          </TouchableOpacity>
        </View>

        {/* Streak Celebration Modal */}
        {celebrationBadge && (
          <StreakCelebration
            streak={celebrationStreak}
            badge={celebrationBadge}
            onDismiss={() => setCelebrationBadge(null)}
          />
        )}

        {/* Notification Permission Prompt */}
        <NotificationPermissionPrompt visible={showNotifPrompt} onDismiss={() => setShowNotifPrompt(false)} />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ThemeToggle />
      <TouchableOpacity
        style={styles.header}
        onPress={() => {
          haptic.light();
          router.push('/profile');
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.avatarSmall, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}>
          <Text style={styles.avatarSmallText}>{auth.profile?.avatar_url || '\uD83C\uDFAD'}</Text>
        </View>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>
          {t('game.greeting', { username: auth.profile?.username ?? 'player' })}
        </Text>
        <Text style={[styles.todayLabel, { color: colors.textMuted }]}>{t('game.todays_word')}</Text>
      </TouchableOpacity>

      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <WordDisplay word={todayWord.word} category={todayWord.category} />
      </View>

      <View style={styles.inputSection}>
        <Text style={[styles.prompt, { color: colors.textSecondary }]}>{t('game.prompt')}</Text>
        <TextInput
          style={[
            styles.descriptionInput,
            { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
          ]}
          placeholder={t('game.placeholder')}
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          autoFocus
          maxLength={DESCRIPTION_MAX_LENGTH}
        />
        <WordCounter count={wordCount} max={DESCRIPTION_WORD_COUNT} />
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
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  countdownText: {
    fontSize: fontSize.sm,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  shareDescLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  shareDescText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
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
  legalText: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    lineHeight: fontSize.xs * 1.5,
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
