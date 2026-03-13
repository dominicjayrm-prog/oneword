-- =============================================
-- Fix: Exclude descriptions the user has already seen in any vote pair
-- Previously, only the specific (A,B) pair was excluded, allowing
-- description A to reappear with a different opponent C.
-- Now, once you vote on a pair containing description X, description X
-- will not appear again in any future pair for the same word.
-- =============================================

CREATE OR REPLACE FUNCTION get_vote_pair(p_word_id UUID, p_voter_id UUID)
RETURNS TABLE(
  desc1_id UUID, desc1_text TEXT, desc1_username TEXT, desc1_badge_emoji TEXT,
  desc2_id UUID, desc2_text TEXT, desc2_username TEXT, desc2_badge_emoji TEXT
) AS $$
BEGIN
  -- Enforce that the caller is the voter
  IF auth.uid() != p_voter_id THEN
    RAISE EXCEPTION 'Forbidden: cannot get vote pairs as another user';
  END IF;

  RETURN QUERY
  WITH seen_descriptions AS (
    -- All descriptions the voter has already seen in any pair
    SELECT DISTINCT unnest(ARRAY[v.winner_id, v.loser_id]) AS desc_id
    FROM votes v
    WHERE v.voter_id = p_voter_id AND v.word_id = p_word_id
  ),
  eligible AS (
    SELECT d.id, d.description, p.username, p.streak_badge_emoji AS badge_emoji
    FROM descriptions d
    JOIN profiles p ON d.user_id = p.id
    JOIN daily_words dw ON d.word_id = dw.id
    WHERE d.word_id = p_word_id
    AND d.user_id != p_voter_id
    -- Only match descriptions for the same language
    AND dw.language = (SELECT dw2.language FROM daily_words dw2 WHERE dw2.id = p_word_id)
    -- Exclude shadowbanned users
    AND p.is_shadowbanned = false
    -- Exclude descriptions the voter has reported
    AND d.id NOT IN (
      SELECT r.description_id FROM reports r WHERE r.reporter_id = p_voter_id
    )
    -- Exclude descriptions with 3+ reports (auto-moderated)
    AND d.id NOT IN (
      SELECT r.description_id FROM reports r
      GROUP BY r.description_id HAVING COUNT(*) >= 3
    )
    -- Exclude descriptions already seen in any previous vote pair
    AND d.id NOT IN (SELECT desc_id FROM seen_descriptions)
  )
  SELECT
    a.id AS a_id, a.description AS a_desc, a.username AS a_user, a.badge_emoji AS a_badge,
    b.id AS b_id, b.description AS b_desc, b.username AS b_user, b.badge_emoji AS b_badge
  FROM eligible a
  CROSS JOIN eligible b
  WHERE a.id < b.id
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
