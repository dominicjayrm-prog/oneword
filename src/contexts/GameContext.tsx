import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { checkProfanity } from '../lib/profanityFilter';
import { withTimeout } from '../lib/withTimeout';
import { rateLimits } from '../lib/rateLimit';
import { DESCRIPTION_WORD_COUNT, LEADERBOARD_LIMIT } from '../constants/app';
import { useAuthContext } from './AuthContext';
import type { DailyWord, VotePair, LeaderboardEntry } from '../types/database';

interface GameContextType {
  todayWord: DailyWord | null;
  hasSubmitted: boolean;
  userDescription: string | null;
  loading: boolean;
  loadError: boolean;
  submitDescription: (description: string) => Promise<{ error: Error | null }>;
  getVotePair: () => Promise<VotePair | null>;
  submitVote: (winnerId: string, loserId: string) => Promise<{ error: Error | null }>;
  getLeaderboard: () => Promise<LeaderboardEntry[]>;
  reportDescription: (descriptionId: string) => Promise<{ error: Error | null }>;
  refresh: () => Promise<void>;
}

// Strict default: throws if used outside <GameProvider>.
const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { session, language } = useAuthContext();
  const userId = session?.user?.id;

  const [todayWord, setTodayWord] = useState<DailyWord | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [userDescription, setUserDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchTodayWord = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await withTimeout(supabase.rpc('get_today_word', { p_language: language }));
      if (data && data.length > 0) {
        setTodayWord(data[0]);
        if (userId) {
          const { data: desc } = await withTimeout(
            supabase
              .from('descriptions')
              .select('description')
              .eq('user_id', userId)
              .eq('word_id', data[0].id)
              .single()
          );
          if (desc) {
            setHasSubmitted(true);
            setUserDescription(desc.description);
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
    } catch {
      console.error('Failed to fetch today word');
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId, language]);

  useEffect(() => {
    fetchTodayWord();
  }, [fetchTodayWord]);

  const submitDescription = useCallback(async (description: string) => {
    if (!todayWord || !userId) return { error: new Error('Not ready') };

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

    const profanityCheck = checkProfanity(description);
    if (!profanityCheck.clean) {
      return { error: new Error('Your description contains inappropriate language. Please try again.') };
    }

    const cleaned = words.join(' ');

    try {
      const { error } = await withTimeout(supabase.from('descriptions').insert({
        user_id: userId,
        word_id: todayWord.id,
        description: cleaned,
      }));

      if (!error) {
        setHasSubmitted(true);
        setUserDescription(cleaned);
        await withTimeout(supabase.rpc('update_streak', { p_user_id: userId }));
      }

      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Network error. Please try again.') };
    }
  }, [todayWord, userId]);

  const getVotePair = useCallback(async (): Promise<VotePair | null> => {
    if (!todayWord || !userId) return null;
    const { data, error } = await withTimeout(supabase.rpc('get_vote_pair', {
      p_word_id: todayWord.id,
      p_voter_id: userId,
    }));
    if (error) {
      throw error;
    }
    if (data && data.length > 0 && data[0].desc1_id && data[0].desc2_id) {
      return data[0];
    }
    return null;
  }, [todayWord, userId]);

  const submitVote = useCallback(async (winnerId: string, loserId: string) => {
    if (!todayWord || !userId) return { error: new Error('Not ready') };
    if (!rateLimits.vote()) {
      return { error: new Error('Voting too fast. Please slow down.') };
    }
    try {
      const { error } = await withTimeout(supabase.rpc('submit_vote', {
        p_voter_id: userId,
        p_word_id: todayWord.id,
        p_winner_id: winnerId,
        p_loser_id: loserId,
      }));
      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Network error. Please try again.') };
    }
  }, [todayWord, userId]);

  const getLeaderboard = useCallback(async (): Promise<LeaderboardEntry[]> => {
    if (!todayWord) return [];
    try {
      const { data } = await withTimeout(supabase.rpc('get_leaderboard', {
        p_word_id: todayWord.id,
        p_limit: LEADERBOARD_LIMIT,
      }));
      return data ?? [];
    } catch {
      console.error('Failed to get leaderboard');
      return [];
    }
  }, [todayWord]);

  const reportDescription = useCallback(async (descriptionId: string) => {
    if (!todayWord || !userId) return { error: new Error('Not ready') };
    if (!rateLimits.report()) {
      return { error: new Error('Too many reports. Please wait a moment.') };
    }
    try {
      const { error } = await withTimeout(supabase.rpc('submit_report', {
        p_reporter_id: userId,
        p_description_id: descriptionId,
        p_word_id: todayWord.id,
      }));
      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Network error. Please try again.') };
    }
  }, [todayWord, userId]);

  const value = useMemo(() => ({
    todayWord,
    hasSubmitted,
    userDescription,
    loading,
    loadError,
    submitDescription,
    getVotePair,
    submitVote,
    getLeaderboard,
    reportDescription,
    refresh: fetchTodayWord,
  }), [todayWord, hasSubmitted, userDescription, loading, loadError, submitDescription, getVotePair, submitVote, getLeaderboard, reportDescription, fetchTodayWord]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a <GameProvider>');
  }
  return context;
}
