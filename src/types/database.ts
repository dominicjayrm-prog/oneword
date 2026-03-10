export interface DailyWord {
  id: string;
  word: string;
  date: string;
  category: string;
  language: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  language: string;
  timezone: string;
  current_streak: number;
  longest_streak: number;
  total_plays: number;
  total_votes_received: number;
  best_rank: number | null;
  streak_badge_emoji: string | null;
  streak_badge_name: string | null;
  last_played_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Description {
  id: string;
  user_id: string;
  word_id: string;
  description: string;
  vote_count: number;
  elo_rating: number;
  matchup_count: number;
  rank: number | null;
  created_at: string;
}

export interface Vote {
  id: string;
  voter_id: string;
  word_id: string;
  winner_id: string;
  loser_id: string;
  created_at: string;
}

export interface VotePair {
  desc1_id: string;
  desc1_text: string;
  desc1_username: string;
  desc1_badge_emoji: string | null;
  desc2_id: string;
  desc2_text: string;
  desc2_username: string;
  desc2_badge_emoji: string | null;
}

export interface YesterdayWinner {
  word: string;
  word_category: string;
  winner_description: string;
  winner_username: string;
  winner_votes: number;
  user_description: string | null;
  user_rank: number | null;
  total_descriptions: number;
  user_was_winner: boolean;
}

export interface WeeklyRecap {
  days_played: number;
  total_votes_received: number;
  best_rank: number | null;
  best_rank_word: string | null;
  best_rank_description: string | null;
  best_rank_total_players: number | null;
  average_rank: number | null;
  previous_week_average_rank: number | null;
  current_streak: number;
  total_descriptions_submitted: number;
  perfect_week: boolean;
  week_start: string;
  week_end: string;
}

export interface LeaderboardEntry {
  description_id: string;
  description_text: string;
  username: string;
  votes: number;
  rank: number;
  streak_badge_emoji: string | null;
}
