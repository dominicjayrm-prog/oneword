-- Filter out descriptions reported by the voter from vote pairing.
-- Also excludes descriptions with 3+ total reports (auto-moderated).

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
    -- Exclude descriptions already seen (voted on)
    AND d.id NOT IN (
      SELECT v.winner_id FROM votes v WHERE v.voter_id = p_voter_id AND v.word_id = p_word_id
      UNION
      SELECT v.loser_id FROM votes v WHERE v.voter_id = p_voter_id AND v.word_id = p_word_id
    )
    -- Exclude descriptions the voter has reported
    AND d.id NOT IN (
      SELECT r.description_id FROM reports r WHERE r.reporter_id = p_voter_id
    )
    -- Exclude descriptions with 3+ reports (auto-moderated)
    AND d.id NOT IN (
      SELECT r.description_id FROM reports r
      GROUP BY r.description_id HAVING COUNT(*) >= 3
    )
    ORDER BY RANDOM()
    LIMIT 2
  )
  SELECT
    (SELECT e.id FROM eligible e LIMIT 1),
    (SELECT e.description FROM eligible e LIMIT 1),
    (SELECT e.username FROM eligible e LIMIT 1),
    (SELECT e.id FROM eligible e OFFSET 1 LIMIT 1),
    (SELECT e.description FROM eligible e OFFSET 1 LIMIT 1),
    (SELECT e.username FROM eligible e OFFSET 1 LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
