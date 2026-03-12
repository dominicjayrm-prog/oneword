import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { checkProfanity } from '../lib/profanityFilter';
import { validateDescription } from '../lib/descriptionValidator';
import i18n from '../lib/i18n';
import { withTimeout } from '../lib/withTimeout';
import { rateLimits } from '../lib/rateLimit';
import { getGameDate, hasWordRolledOver } from '../lib/gameDate';
import { DESCRIPTION_WORD_COUNT, LEADERBOARD_LIMIT } from '../constants/app';
import { cacheData, getCachedData, CACHE_KEYS } from '../lib/cache';
import { useAuthContext } from './AuthContext';
import type { DailyWord, VotePair, LeaderboardEntry, YesterdayWinner, WeeklyRecap } from '../types/database';

const PENDING_DESCRIPTION_KEY = 'pending_description';

interface GameContextType {
  todayWord: DailyWord | null;
  hasSubmitted: boolean;
  userDescription: string | null;
  loading: boolean;
  loadError: boolean;
  hasPendingDescription: boolean;
  submitDescription: (description: string) => Promise<{ error: Error | null; oldStreak?: number }>;
  getVotePair: () => Promise<VotePair | null>;
  submitVote: (winnerId: string, loserId: string) => Promise<{ error: Error | null }>;
  getLeaderboard: () => Promise<LeaderboardEntry[]>;
  reportDescription: (descriptionId: string) => Promise<{ error: Error | null }>;
  getYesterdayWinner: () => Promise<YesterdayWinner | null>;
  getWeeklyRecap: () => Promise<WeeklyRecap | null>;
  refresh: () => Promise<void>;
}

// Strict default: throws if used outside <GameProvider>.
const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { session, language, profile: authProfile, refreshProfile } = useAuthContext();
  const userId = session?.user?.id;

  const [todayWord, setTodayWord] = useState<DailyWord | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [userDescription, setUserDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [hasPendingDescription, setHasPendingDescription] = useState(false);

  const fetchTodayWord = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await withTimeout(supabase.rpc('get_today_word', { p_language: language }));
      if (error) throw error;
      if (data && data.length > 0) {
        setTodayWord(data[0]);
        // Cache today's word for offline use
        await cacheData(CACHE_KEYS.TODAY_WORD, data[0]);
        if (userId) {
          const { data: desc, error: descError } = await withTimeout(
            supabase
              .from('descriptions')
              .select('description')
              .eq('user_id', userId)
              .eq('word_id', data[0].id)
              .single(),
          );
          if (descError && descError.code !== 'PGRST116') throw descError;
          if (desc) {
            setHasSubmitted(true);
            setUserDescription(desc.description);
            await cacheData(CACHE_KEYS.MY_DESCRIPTION, desc.description);
          } else {
            setHasSubmitted(false);
            setUserDescription(null);
          }
        }
      } else {
        setTodayWord(null);
        setHasSubmitted(false);
        setUserDescription(null);
      }
    } catch (err) {
      console.error('Failed to fetch today word:', err);
      // Try to load from cache on failure
      const cachedWord = await getCachedData<DailyWord>(CACHE_KEYS.TODAY_WORD, 24);
      if (cachedWord) {
        setTodayWord(cachedWord);
        const cachedDesc = await getCachedData<string>(CACHE_KEYS.MY_DESCRIPTION, 24);
        if (cachedDesc) {
          setHasSubmitted(true);
          setUserDescription(cachedDesc);
        }
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, language]);

  useEffect(() => {
    fetchTodayWord();
  }, [fetchTodayWord]);

  // Re-fetch today's word when the game date rolls over (5am UTC).
  // Handles both: (1) app returning from background, (2) app left open across rollover.
  const lastGameDateRef = useRef(getGameDate());
  useEffect(() => {
    const checkRollover = () => {
      if (hasWordRolledOver(lastGameDateRef.current)) {
        lastGameDateRef.current = getGameDate();
        fetchTodayWord();
      }
    };

    // Check on app foreground
    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active') checkRollover();
    };
    const sub = AppState.addEventListener('change', handleAppState);

    // Also poll every 60s in case app stays open across the rollover boundary
    const interval = setInterval(checkRollover, 60_000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [fetchTodayWord]);

  // Check for pending description on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_DESCRIPTION_KEY);
        if (raw) {
          const { timestamp } = JSON.parse(raw);
          const hoursSinceSaved = (Date.now() - timestamp) / (1000 * 60 * 60);
          if (hoursSinceSaved < 24) {
            setHasPendingDescription(true);
          } else {
            await AsyncStorage.removeItem(PENDING_DESCRIPTION_KEY);
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Auto-retry pending description on network reconnection
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (!state.isConnected) return;

      try {
        const raw = await AsyncStorage.getItem(PENDING_DESCRIPTION_KEY);
        if (!raw) return;

        const { description, wordId, timestamp } = JSON.parse(raw);
        const hoursSinceSaved = (Date.now() - timestamp) / (1000 * 60 * 60);

        if (hoursSinceSaved >= 24) {
          await AsyncStorage.removeItem(PENDING_DESCRIPTION_KEY);
          setHasPendingDescription(false);
          return;
        }

        // Don't submit if the game day has rolled over — the word has changed
        if (todayWord && wordId !== todayWord.id) {
          await AsyncStorage.removeItem(PENDING_DESCRIPTION_KEY);
          setHasPendingDescription(false);
          return;
        }

        const { error } = await supabase.from('descriptions').insert({
          user_id: userId,
          word_id: wordId,
          description,
        });

        if (!error) {
          await AsyncStorage.removeItem(PENDING_DESCRIPTION_KEY);
          setHasPendingDescription(false);
          setHasSubmitted(true);
          setUserDescription(description);
          await cacheData(CACHE_KEYS.MY_DESCRIPTION, description);
          // Try to update streak too
          try {
            await supabase.rpc('update_streak', { p_user_id: userId });
            await refreshProfile();
          } catch {
            // non-critical
          }
        }
      } catch {
        // Still failing — leave pending for next retry
      }
    });

    return () => unsubscribe();
  }, [userId, todayWord, refreshProfile]);

  const submitDescription = useCallback(
    async (description: string) => {
      if (!todayWord || !userId) return { error: new Error('Not ready') };
      if (!rateLimits.submit()) {
        return { error: new Error('Submitting too fast. Please wait a moment.') };
      }

      const words = description.trim().split(/\s+/).filter(Boolean);
      if (words.length !== DESCRIPTION_WORD_COUNT) {
        return { error: new Error('Your description must be exactly 5 words.') };
      }

      // Each word must contain at least one letter and no repeated char spam (e.g. "aaaa")
      for (const w of words) {
        if (!/[a-zA-ZÀ-ÿ]/.test(w)) {
          return { error: new Error('Each word must contain at least one letter.') };
        }
        if (/^(.)\1+$/.test(w)) {
          return { error: new Error('Please use real words in your description.') };
        }
      }

      // Client-side gibberish/spam validation
      const validationError = validateDescription(words, language);
      if (validationError) {
        return { error: new Error(i18n.t(validationError.message)) };
      }

      // Client-side profanity check
      const profanityCheck = checkProfanity(description);
      if (!profanityCheck.clean) {
        return { error: new Error(i18n.t('validation.profanity_blocked')) };
      }

      const cleaned = words.join(' ');

      const oldStreak = authProfile?.current_streak ?? 0;

      // IMMEDIATELY save locally before attempting network request
      await AsyncStorage.setItem(
        PENDING_DESCRIPTION_KEY,
        JSON.stringify({
          description: cleaned,
          wordId: todayWord.id,
          timestamp: Date.now(),
        }),
      );
      setHasPendingDescription(true);

      try {
        // Use server-side validation + insertion function
        const { data, error: rpcError } = await withTimeout(
          supabase.rpc('validate_and_submit_description', {
            p_user_id: userId,
            p_word_id: todayWord.id,
            p_description: cleaned,
          }),
        );

        if (rpcError) {
          return { error: rpcError, oldStreak };
        }

        const result = data && data.length > 0 ? data[0] : null;

        if (result && !result.success) {
          // Server rejected — clear pending and return user-friendly error
          await AsyncStorage.removeItem(PENDING_DESCRIPTION_KEY);
          setHasPendingDescription(false);

          // Map server error codes to i18n messages
          let errorMessage: string;
          switch (result.error_code) {
            case 'DUPLICATE_DESCRIPTION':
              errorMessage = i18n.t('validation.duplicate');
              break;
            case 'INVALID_WORD_LENGTH':
            case 'GIBBERISH_DETECTED':
              errorMessage = i18n.t('validation.gibberish');
              break;
            case 'TOO_MANY_REPEATS':
              errorMessage = i18n.t('validation.too_many_repeats');
              break;
            case 'ALREADY_SUBMITTED':
              errorMessage = i18n.t('errors.submit_failed');
              break;
            default:
              errorMessage = result.error_message || i18n.t('errors.submit_failed');
          }
          return { error: new Error(errorMessage), oldStreak };
        }

        // Success — clear the pending description
        await AsyncStorage.removeItem(PENDING_DESCRIPTION_KEY);
        setHasPendingDescription(false);
        setHasSubmitted(true);
        setUserDescription(cleaned);
        await cacheData(CACHE_KEYS.MY_DESCRIPTION, cleaned);
        await withTimeout(supabase.rpc('update_streak', { p_user_id: userId }));
        // Refresh profile so badge fields + streak are up to date
        await refreshProfile();

        return { error: null, oldStreak };
      } catch (err) {
        // Network failed — description is safely stored locally
        // Return a special 'pending' state — not a hard error since data is saved
        return { error: err instanceof Error ? err : new Error('Network error. Please try again.'), oldStreak };
      }
    },
    [todayWord, userId, language, authProfile?.current_streak, refreshProfile],
  );

  const getVotePair = useCallback(async (): Promise<VotePair | null> => {
    if (!todayWord || !userId) return null;
    const { data, error } = await withTimeout(
      supabase.rpc('get_vote_pair', {
        p_word_id: todayWord.id,
        p_voter_id: userId,
      }),
    );
    if (error) {
      throw error;
    }
    if (data && data.length > 0 && data[0].desc1_id && data[0].desc2_id) {
      return data[0];
    }
    return null;
  }, [todayWord, userId]);

  const submitVote = useCallback(
    async (winnerId: string, loserId: string) => {
      if (!todayWord || !userId) return { error: new Error('Not ready') };
      if (!rateLimits.vote()) {
        return { error: new Error('Voting too fast. Please slow down.') };
      }
      try {
        const { error } = await withTimeout(
          supabase.rpc('submit_vote', {
            p_voter_id: userId,
            p_word_id: todayWord.id,
            p_winner_id: winnerId,
            p_loser_id: loserId,
          }),
        );
        return { error };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('Network error. Please try again.') };
      }
    },
    [todayWord, userId],
  );

  const getLeaderboard = useCallback(async (): Promise<LeaderboardEntry[]> => {
    if (!todayWord) return [];
    try {
      const { data, error } = await withTimeout(
        supabase.rpc('get_leaderboard', {
          p_word_id: todayWord.id,
          p_limit: LEADERBOARD_LIMIT,
        }),
      );
      if (error) throw error;
      const results = data ?? [];
      // Cache results for offline viewing
      if (results.length > 0) {
        await cacheData(CACHE_KEYS.LAST_RESULTS, results);
      }
      return results;
    } catch (err) {
      // Try to return cached results on failure
      const cached = await getCachedData<LeaderboardEntry[]>(CACHE_KEYS.LAST_RESULTS, 24);
      if (cached) return cached;
      throw err;
    }
  }, [todayWord]);

  const reportDescription = useCallback(
    async (descriptionId: string) => {
      if (!todayWord || !userId) return { error: new Error('Not ready') };
      if (!rateLimits.report()) {
        return { error: new Error('Too many reports. Please wait a moment.') };
      }
      try {
        const { error } = await withTimeout(
          supabase.rpc('submit_report', {
            p_reporter_id: userId,
            p_description_id: descriptionId,
            p_word_id: todayWord.id,
          }),
        );
        return { error };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('Network error. Please try again.') };
      }
    },
    [todayWord, userId],
  );

  const getYesterdayWinner = useCallback(async (): Promise<YesterdayWinner | null> => {
    if (!userId) return null;
    try {
      const { data, error } = await withTimeout(
        supabase.rpc('get_yesterday_winner', {
          p_user_id: userId,
          p_language: language,
        }),
      );
      if (error) throw error;
      if (__DEV__) {
        console.log('[getYesterdayWinner] language:', language, 'data:', JSON.stringify(data));
      }
      if (data && data.length > 0 && data[0].winner_description) {
        return data[0];
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch yesterday winner', err);
      return null;
    }
  }, [userId, language]);

  const getWeeklyRecap = useCallback(async (): Promise<WeeklyRecap | null> => {
    if (!userId) return null;
    try {
      const { data, error } = await withTimeout(
        supabase.rpc('get_weekly_recap', {
          p_user_id: userId,
          p_language: language,
        }),
      );
      if (error) throw error;
      if (data && data.length > 0 && data[0].days_played > 0) {
        return data[0];
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch weekly recap:', err);
      return null;
    }
  }, [userId, language]);

  const value = useMemo(
    () => ({
      todayWord,
      hasSubmitted,
      userDescription,
      loading,
      loadError,
      hasPendingDescription,
      submitDescription,
      getVotePair,
      submitVote,
      getLeaderboard,
      reportDescription,
      getYesterdayWinner,
      getWeeklyRecap,
      refresh: fetchTodayWord,
    }),
    [
      todayWord,
      hasSubmitted,
      userDescription,
      loading,
      loadError,
      hasPendingDescription,
      submitDescription,
      getVotePair,
      submitVote,
      getLeaderboard,
      reportDescription,
      getYesterdayWinner,
      getWeeklyRecap,
      fetchTodayWord,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a <GameProvider>');
  }
  return context;
}
