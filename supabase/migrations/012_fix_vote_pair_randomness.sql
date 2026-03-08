-- Fix get_vote_pair to use random selection instead of deterministic ordering.
-- The previous version always picked the description with the lowest matchup_count,
-- causing the same pair to appear repeatedly, especially after seed voting.

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
  -- Pick the first description randomly
  pick1 AS (
    SELECT * FROM eligible
    ORDER BY RANDOM()
    LIMIT 1
  ),
  -- Pick a second description, preferring similar Elo but with randomness
  pick2 AS (
    SELECT e.* FROM eligible e, pick1 p1
    WHERE e.id != p1.id
    ORDER BY RANDOM()
    LIMIT 1
  )
  SELECT
    p1.id, p1.description, p1.username,
    p2.id, p2.description, p2.username
  FROM pick1 p1, pick2 p2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also drop the old no-parameter overload of get_today_word from migration 002
-- to avoid ambiguity when calling without parameters
DROP FUNCTION IF EXISTS get_today_word();
