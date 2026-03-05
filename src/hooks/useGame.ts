import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { DailyWord, VotePair, LeaderboardEntry } from '../types/database';

export function useGame(userId: string | undefined) {
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

    const { error } = await supabase.from('descriptions').insert({
      user_id: userId,
      word_id: todayWord.id,
      description: description.trim(),
    });

    if (!error) {
      setHasSubmitted(true);
      setUserDescription(description.trim());

      // Update streak
      await supabase.rpc('update_streak', { p_user_id: userId }).catch(() => {
        // Streak function may not exist yet
      });
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

  return {
    todayWord,
    hasSubmitted,
    userDescription,
    loading,
    submitDescription,
    getVotePair,
    submitVote,
    getLeaderboard,
    refresh: fetchTodayWord,
  };
}
