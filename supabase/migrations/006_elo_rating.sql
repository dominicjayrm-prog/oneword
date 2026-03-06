-- Add elo_rating column to descriptions
ALTER TABLE descriptions ADD COLUMN IF NOT EXISTS elo_rating DECIMAL DEFAULT 1000.0;
ALTER TABLE descriptions ADD COLUMN IF NOT EXISTS matchup_count INTEGER DEFAULT 0;

-- Update submit_vote to calculate Elo ratings
CREATE OR REPLACE FUNCTION submit_vote(
  p_voter_id UUID,
  p_word_id UUID,
  p_winner_id UUID,
  p_loser_id UUID
) RETURNS void AS $$
DECLARE
  v_winner_user_id UUID;
  v_winner_elo DECIMAL;
  v_loser_elo DECIMAL;
  v_expected_winner DECIMAL;
  v_expected_loser DECIMAL;
  v_k CONSTANT DECIMAL := 32.0;
BEGIN
  -- Insert the vote
  INSERT INTO votes (voter_id, word_id, winner_id, loser_id)
  VALUES (p_voter_id, p_word_id, p_winner_id, p_loser_id);

  -- Get current Elo ratings
  SELECT elo_rating INTO v_winner_elo FROM descriptions WHERE id = p_winner_id;
  SELECT elo_rating INTO v_loser_elo FROM descriptions WHERE id = p_loser_id;

  -- Calculate expected scores
  v_expected_winner := 1.0 / (1.0 + POWER(10.0, (v_loser_elo - v_winner_elo) / 400.0));
  v_expected_loser := 1.0 / (1.0 + POWER(10.0, (v_winner_elo - v_loser_elo) / 400.0));

  -- Update winner: gains rating
  UPDATE descriptions
  SET vote_count = vote_count + 1,
      elo_rating = elo_rating + v_k * (1.0 - v_expected_winner),
      matchup_count = matchup_count + 1
  WHERE id = p_winner_id;

  -- Update loser: loses rating
  UPDATE descriptions
  SET elo_rating = elo_rating - v_k * v_expected_loser,
      matchup_count = matchup_count + 1
  WHERE id = p_loser_id;

  -- Increment total_votes_received on the winning user's profile
  SELECT user_id INTO v_winner_user_id FROM descriptions WHERE id = p_winner_id;
  UPDATE profiles SET total_votes_received = total_votes_received + 1, updated_at = NOW()
  WHERE id = v_winner_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_vote_pair to prefer similar Elo ratings and favour fewer matchups
CREATE OR REPLACE FUNCTION get_vote_pair(p_word_id UUID, p_voter_id UUID)
RETURNS TABLE(
  desc1_id UUID, desc1_text TEXT, desc1_username TEXT,
  desc2_id UUID, desc2_text TEXT, desc2_username TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH eligible AS (
    SELECT d.id, d.description, p.username, d.elo_rating, d.matchup_count
    FROM descriptions d
    JOIN profiles p ON d.user_id = p.id
    WHERE d.word_id = p_word_id
    AND d.user_id != p_voter_id
    AND d.id NOT IN (
      SELECT v.winner_id FROM votes v WHERE v.voter_id = p_voter_id AND v.word_id = p_word_id
      UNION
      SELECT v.loser_id FROM votes v WHERE v.voter_id = p_voter_id AND v.word_id = p_word_id
    )
  ),
  -- Pick the first description, slightly favouring those with fewer matchups
  pick1 AS (
    SELECT * FROM eligible
    ORDER BY matchup_count ASC, RANDOM()
    LIMIT 1
  ),
  -- Pick a second description close in Elo to the first, excluding the first
  pick2 AS (
    SELECT e.* FROM eligible e, pick1 p1
    WHERE e.id != p1.id
    ORDER BY ABS(e.elo_rating - p1.elo_rating) ASC, RANDOM()
    LIMIT 1
  )
  SELECT
    p1.id, p1.description, p1.username,
    p2.id, p2.description, p2.username
  FROM pick1 p1, pick2 p2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update leaderboard to rank by elo_rating
CREATE OR REPLACE FUNCTION get_leaderboard(p_word_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  description_id UUID,
  description_text TEXT,
  username TEXT,
  votes INTEGER,
  rank BIGINT
) AS $$
BEGIN
  -- Update best_rank for all users who submitted for this word
  WITH ranked AS (
    SELECT d.user_id, ROW_NUMBER() OVER (ORDER BY d.elo_rating DESC) as r
    FROM descriptions d
    WHERE d.word_id = p_word_id
  )
  UPDATE profiles p
  SET best_rank = LEAST(COALESCE(p.best_rank, ranked.r::INTEGER), ranked.r::INTEGER),
      updated_at = NOW()
  FROM ranked
  WHERE p.id = ranked.user_id;

  -- Return the leaderboard ranked by Elo
  RETURN QUERY
  SELECT
    d.id,
    d.description,
    p.username,
    d.vote_count,
    ROW_NUMBER() OVER (ORDER BY d.elo_rating DESC) as rank
  FROM descriptions d
  JOIN profiles p ON d.user_id = p.id
  WHERE d.word_id = p_word_id
  ORDER BY d.elo_rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
