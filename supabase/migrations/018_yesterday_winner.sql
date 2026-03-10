-- Yesterday's Winner: returns the top-ranked description from the previous day's
-- word for the given language, along with the requesting user's own entry (if any).

CREATE OR REPLACE FUNCTION get_yesterday_winner(p_user_id UUID, p_language TEXT)
RETURNS TABLE(
  word TEXT,
  word_category TEXT,
  winner_description TEXT,
  winner_username TEXT,
  winner_votes INTEGER,
  user_description TEXT,
  user_rank BIGINT,
  total_descriptions BIGINT,
  user_was_winner BOOLEAN
) AS $$
DECLARE
  yesterday_word_id UUID;
  yesterday_word TEXT;
  yesterday_category TEXT;
BEGIN
  -- Get yesterday's word for this language
  SELECT dw.id, dw.word, dw.category
  INTO yesterday_word_id, yesterday_word, yesterday_category
  FROM daily_words dw
  WHERE dw.date = CURRENT_DATE - 1
    AND dw.language = p_language;

  IF yesterday_word_id IS NULL THEN
    RETURN; -- No word yesterday
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      d.description,
      p.username,
      d.vote_count,
      d.user_id,
      ROW_NUMBER() OVER (ORDER BY d.vote_count DESC, d.created_at ASC) as rnk,
      COUNT(*) OVER () as total
    FROM descriptions d
    JOIN profiles p ON d.user_id = p.id
    WHERE d.word_id = yesterday_word_id
  ),
  winner AS (
    SELECT * FROM ranked WHERE rnk = 1
  ),
  user_entry AS (
    SELECT * FROM ranked WHERE user_id = p_user_id
  )
  SELECT
    yesterday_word,
    yesterday_category,
    w.description,
    w.username,
    w.vote_count,
    ue.description,
    ue.rnk,
    w.total,
    COALESCE(w.user_id = p_user_id, FALSE)
  FROM winner w
  LEFT JOIN user_entry ue ON TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
