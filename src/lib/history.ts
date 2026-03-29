import { supabase } from './supabase';

export interface HistoryEntry {
  date: string;
  word: string;
  category: string;
  user_description: string;
  user_rank: number;
  total_players: number;
  winning_description: string | null;
  winner_user_id: string | null;
}

export interface MonthStats {
  words_played: number;
  best_rank: number | null;
  avg_rank: number | null;
}

/**
 * Fetch the user's play history for a given month.
 * Returns entries sorted newest first.
 */
export async function getMonthHistory(
  userId: string,
  year: number,
  month: number,
  language: string,
): Promise<HistoryEntry[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDay = new Date(year, month, 0).getDate(); // last day of month
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  // Get user's descriptions with the daily word info
  const { data: userDescs, error: descError } = await supabase
    .from('descriptions')
    .select(
      `
      id,
      description,
      vote_count,
      word_id,
      daily_words!inner (
        id,
        word,
        date,
        category,
        language
      )
    `,
    )
    .eq('user_id', userId)
    .gte('daily_words.date', startDate)
    .lte('daily_words.date', endDate)
    .eq('daily_words.language', language);

  if (descError || !userDescs) return [];

  const entries: HistoryEntry[] = [];

  for (const desc of userDescs) {
    const dw = (desc as any).daily_words;
    if (!dw) continue;

    const wordId = dw.id;

    // Get total players and all descriptions for this word to compute rank
    const { data: allDescs } = await supabase
      .from('descriptions')
      .select('id, user_id, description, vote_count')
      .eq('word_id', wordId)
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: true });

    const totalPlayers = allDescs?.length ?? 0;
    const userRank = allDescs ? allDescs.findIndex((d) => d.id === desc.id) + 1 : 0;
    const winner = allDescs?.[0] ?? null;

    entries.push({
      date: dw.date,
      word: dw.word,
      category: dw.category ?? '',
      user_description: desc.description,
      user_rank: userRank,
      total_players: totalPlayers,
      winning_description: winner?.description ?? null,
      winner_user_id: winner?.user_id ?? null,
    });
  }

  // Sort newest first
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Compute stats for a month from already-fetched entries.
 */
export function computeMonthStats(entries: HistoryEntry[]): MonthStats {
  if (entries.length === 0) {
    return { words_played: 0, best_rank: null, avg_rank: null };
  }

  const ranks = entries.map((e) => e.user_rank).filter((r) => r > 0);
  return {
    words_played: entries.length,
    best_rank: ranks.length > 0 ? Math.min(...ranks) : null,
    avg_rank: ranks.length > 0 ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length) : null,
  };
}

/**
 * Get the user's all-time best rank (for personal best badge).
 */
export async function getAllTimeBestRank(userId: string): Promise<number | null> {
  const { data } = await supabase.from('profiles').select('best_rank').eq('id', userId).single();

  return data?.best_rank ?? null;
}

/**
 * Get the set of dates the user played in a given month (for the calendar).
 */
export function getPlayedDates(entries: HistoryEntry[]): Set<string> {
  return new Set(entries.map((e) => e.date));
}
