-- Fix 1: get_vote_pair - only exclude specific PAIRS already voted on,
-- not entire descriptions. This allows descriptions to appear in multiple
-- pairs with different opponents, giving voters many more matchups.
--
-- Fix 2: get_leaderboard - rank by vote_count (most votes = #1) instead of
-- Elo rating, which was confusing since someone with fewer votes could rank higher.

CREATE OR REPLACE FUNCTION get_vote_pair(p_word_id UUID, p_voter_id UUID)
RETURNS TABLE(
  desc1_id UUID, desc1_text TEXT, desc1_username TEXT,
  desc2_id UUID, desc2_text TEXT, desc2_username TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH eligible AS (
    SELECT d.id, d.description, p.username
    FROM descriptions d
    JOIN profiles p ON d.user_id = p.id
    WHERE d.word_id = p_word_id
    AND d.user_id != p_voter_id
  ),
  voted_pairs AS (
    SELECT v.winner_id, v.loser_id
    FROM votes v
    WHERE v.voter_id = p_voter_id AND v.word_id = p_word_id
  ),
  available_pairs AS (
    SELECT
      a.id AS a_id, a.description AS a_desc, a.username AS a_user,
      b.id AS b_id, b.description AS b_desc, b.username AS b_user
    FROM eligible a
    CROSS JOIN eligible b
    WHERE a.id < b.id
    AND NOT EXISTS (
      SELECT 1 FROM voted_pairs vp
      WHERE (vp.winner_id = a.id AND vp.loser_id = b.id)
         OR (vp.winner_id = b.id AND vp.loser_id = a.id)
    )
  )
  SELECT a_id, a_desc, a_user, b_id, b_desc, b_user
  FROM available_pairs
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix leaderboard: rank by vote_count (most votes first)
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
    SELECT d.user_id, ROW_NUMBER() OVER (ORDER BY d.vote_count DESC, d.created_at ASC) as r
    FROM descriptions d
    WHERE d.word_id = p_word_id
  )
  UPDATE profiles p
  SET best_rank = LEAST(COALESCE(p.best_rank, ranked.r::INTEGER), ranked.r::INTEGER),
      updated_at = NOW()
  FROM ranked
  WHERE p.id = ranked.user_id;

  -- Return the leaderboard ranked by vote_count
  RETURN QUERY
  SELECT
    d.id,
    d.description,
    p.username,
    d.vote_count,
    ROW_NUMBER() OVER (ORDER BY d.vote_count DESC, d.created_at ASC) as rank
  FROM descriptions d
  JOIN profiles p ON d.user_id = p.id
  WHERE d.word_id = p_word_id
  ORDER BY d.vote_count DESC, d.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
