import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { checkProfanity } from '../lib/profanityFilter';
import { useAuthContext } from './AuthContext';
import type { DailyWord, VotePair, LeaderboardEntry } from '../types/database';

interface GameContextType {
  todayWord: DailyWord | null;
  hasSubmitted: boolean;
  userDescription: string | null;
  loading: boolean;
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
  submitDescription: async () => ({ error: null }),
  getVotePair: async () => null,
  submitVote: async () => ({ error: null }),
  getLeaderboard: async () => [],
  reportDescription: async () => ({ error: null }),
  refresh: async () => {},
});

export function GameProvider({ children }: { children: ReactNode }) {
  const { session } = useAuthContext();
  const userId = session?.user?.id;

  const [todayWord, setTodayWord] = useState<DailyWord | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [userDescription, setUserDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTodayWord = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_today_word');
    if (data && data.length > 0) {
      setTodayWord(data[0]);
      if (userId) {
        const { data: desc } = await supabase
          .from('descriptions')
          .select('description')
          .eq('user_id', userId)
          .eq('word_id', data[0].id)
          .single();
        if (desc) {
          setHasSubmitted(true);
          setUserDescription(desc.description);
        }
      }
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchTodayWord();
  }, [fetchTodayWord]);

  async function submitDescription(description: string) {
    if (!todayWord || !userId) return { error: new Error('Not ready') };

    const profanityCheck = checkProfanity(description);
    if (!profanityCheck.clean) {
      return { error: new Error('Your description contains inappropriate language. Please try again.') };
    }

    const { error } = await supabase.from('descriptions').insert({
      user_id: userId,
      word_id: todayWord.id,
      description: description.trim(),
    });

    if (!error) {
      setHasSubmitted(true);
      setUserDescription(description.trim());
      await supabase.rpc('update_streak', { p_user_id: userId });
    }

    return { error };
  }

  async function getVotePair(): Promise<VotePair | null> {
    if (!todayWord || !userId) return null;
    const { data } = await supabase.rpc('get_vote_pair', {
      p_word_id: todayWord.id,
      p_voter_id: userId,
    });
    if (data && data.length > 0 && data[0].desc1_id && data[0].desc2_id) {
      return data[0];
    }
    return null;
  }

  async function submitVote(winnerId: string, loserId: string) {
    if (!todayWord || !userId) return { error: new Error('Not ready') };
    const { error } = await supabase.rpc('submit_vote', {
      p_voter_id: userId,
      p_word_id: todayWord.id,
      p_winner_id: winnerId,
      p_loser_id: loserId,
    });
    return { error };
  }

  async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    if (!todayWord) return [];
    const { data } = await supabase.rpc('get_leaderboard', {
      p_word_id: todayWord.id,
      p_limit: 20,
    });
    return data ?? [];
  }

  async function reportDescription(descriptionId: string) {
    if (!todayWord || !userId) return { error: new Error('Not ready') };
    const { error } = await supabase.rpc('submit_report', {
      p_reporter_id: userId,
      p_description_id: descriptionId,
      p_word_id: todayWord.id,
    });
    return { error };
  }

  return (
    <GameContext.Provider value={{
      todayWord,
      hasSubmitted,
      userDescription,
      loading,
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
