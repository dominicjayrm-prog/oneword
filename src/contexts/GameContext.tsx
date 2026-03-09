import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { checkProfanity } from '../lib/profanityFilter';
import { withTimeout } from '../lib/withTimeout';
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

const GameContext = createContext<GameContextType>({
  todayWord: null,
  hasSubmitted: false,
  userDescription: null,
  loading: true,
  loadError: false,
  submitDescription: async () => ({ error: null }),
  getVotePair: async () => null,
  submitVote: async () => ({ error: null }),
  getLeaderboard: async () => [],
  reportDescription: async () => ({ error: null }),
  refresh: async () => {},
});

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
    } catch (err) {
      console.error('Failed to fetch today word:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId, language]);

  useEffect(() => {
    fetchTodayWord();
  }, [fetchTodayWord]);

  async function submitDescription(description: string) {
    if (!todayWord || !userId) return { error: new Error('Not ready') };

    const words = description.trim().split(/\s+/).filter(Boolean);
    if (words.length !== 5) {
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
  }

  async function getVotePair(): Promise<VotePair | null> {
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
  }

  async function submitVote(winnerId: string, loserId: string) {
    if (!todayWord || !userId) return { error: new Error('Not ready') };
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
  }

  async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    if (!todayWord) return [];
    try {
      const { data } = await withTimeout(supabase.rpc('get_leaderboard', {
        p_word_id: todayWord.id,
        p_limit: 20,
      }));
      return data ?? [];
    } catch (err) {
      console.error('Failed to get leaderboard:', err);
      return [];
    }
  }

  async function reportDescription(descriptionId: string) {
    if (!todayWord || !userId) return { error: new Error('Not ready') };
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
  }

  return (
    <GameContext.Provider value={{
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
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  return useContext(GameContext);
}
