-- =============================================
-- Security & bug fixes batch
-- =============================================

-- #6: Add language filter to get_vote_pair to prevent cross-language matches.
-- The function joins descriptions by word_id, but a word_id is unique per
-- (date, language), so cross-language won't actually occur in practice.
-- However, the daily_words table could theoretically have duplicates if
-- language scoping is ever relaxed, so we add an explicit language filter
-- via the daily_words join for defense-in-depth.
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
    JOIN daily_words dw ON d.word_id = dw.id
    WHERE d.word_id = p_word_id
    AND d.user_id != p_voter_id
    -- Only match descriptions for the same language
    AND dw.language = (SELECT dw2.language FROM daily_words dw2 WHERE dw2.id = p_word_id)
    -- Exclude descriptions the voter has reported
    AND d.id NOT IN (
      SELECT r.description_id FROM reports r WHERE r.reporter_id = p_voter_id
    )
    -- Exclude descriptions with 3+ reports (auto-moderated)
    AND d.id NOT IN (
      SELECT r.description_id FROM reports r
      GROUP BY r.description_id HAVING COUNT(*) >= 3
    )
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

-- #11: Server-side vote rate limiting.
-- The existing check_vote_rate() trigger (migration 017) already enforces
-- 30 votes per 30 seconds at the DB level. This is the server-side enforcement.
-- No additional changes needed — the trigger is already in place.
-- This comment documents that #11 is already covered.
