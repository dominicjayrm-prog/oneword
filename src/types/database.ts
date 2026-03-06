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
  current_streak: number;
  longest_streak: number;
  total_plays: number;
  total_votes_received: number;
  best_rank: number | null;
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
  desc2_id: string;
  desc2_text: string;
  desc2_username: string;
}

export interface LeaderboardEntry {
  description_id: string;
  description_text: string;
  username: string;
  votes: number;
  rank: number;
}
