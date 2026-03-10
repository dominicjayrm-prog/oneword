-- Weekly Recap: returns the user's stats for the previous Mon-Sun week.
-- Only returns a row if the user played at least 1 day that week.

CREATE OR REPLACE FUNCTION get_weekly_recap(p_user_id UUID, p_language TEXT)
RETURNS TABLE(
  days_played INTEGER,
  total_votes_received INTEGER,
  best_rank INTEGER,
  best_rank_word TEXT,
  best_rank_description TEXT,
  best_rank_total_players BIGINT,
  average_rank NUMERIC,
  previous_week_average_rank NUMERIC,
  current_streak INTEGER,
  total_descriptions_submitted INTEGER,
  perfect_week BOOLEAN,
  week_start DATE,
  week_end DATE
) AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_prev_week_start DATE;
  v_prev_week_end DATE;
BEGIN
  -- Last week: Monday to Sunday
  v_week_end := (date_trunc('week', CURRENT_DATE)::DATE) - 1;   -- last Sunday
  v_week_start := v_week_end - 6;                                 -- last Monday

  -- Previous week for comparison
  v_prev_week_end := v_week_start - 1;
  v_prev_week_start := v_prev_week_end - 6;

  RETURN QUERY
  WITH last_week_entries AS (
    SELECT
      d.id,
      d.description,
      d.vote_count,
      dw.word,
      dw.date,
      ROW_NUMBER() OVER (PARTITION BY d.word_id ORDER BY d.vote_count DESC, d.created_at ASC) AS rank_in_word,
      COUNT(*) OVER (PARTITION BY d.word_id) AS total_in_word
    FROM descriptions d
    JOIN daily_words dw ON d.word_id = dw.id
    WHERE d.user_id = p_user_id
      AND dw.language = p_language
      AND dw.date BETWEEN v_week_start AND v_week_end
  ),
  best AS (
    SELECT * FROM last_week_entries
    ORDER BY rank_in_word ASC, total_in_word DESC
    LIMIT 1
  ),
  prev_week_entries AS (
    SELECT
      ROW_NUMBER() OVER (PARTITION BY d.word_id ORDER BY d.vote_count DESC, d.created_at ASC) AS rank_in_word
    FROM descriptions d
    JOIN daily_words dw ON d.word_id = dw.id
    WHERE d.user_id = p_user_id
      AND dw.language = p_language
      AND dw.date BETWEEN v_prev_week_start AND v_prev_week_end
  ),
  user_profile AS (
    SELECT p.current_streak FROM profiles p WHERE p.id = p_user_id
  )
  SELECT
    (SELECT COUNT(DISTINCT lwe.date)::INTEGER FROM last_week_entries lwe),
    (SELECT COALESCE(SUM(lwe.vote_count), 0)::INTEGER FROM last_week_entries lwe),
    (SELECT b.rank_in_word::INTEGER FROM best b),
    (SELECT b.word FROM best b),
    (SELECT b.description FROM best b),
    (SELECT b.total_in_word FROM best b),
    (SELECT ROUND(AVG(lwe.rank_in_word), 0) FROM last_week_entries lwe),
    (SELECT ROUND(AVG(pwe.rank_in_word), 0) FROM prev_week_entries pwe),
    (SELECT up.current_streak FROM user_profile up),
    (SELECT COUNT(*)::INTEGER FROM last_week_entries lwe),
    (SELECT COUNT(DISTINCT lwe.date) = 7 FROM last_week_entries lwe),
    v_week_start,
    v_week_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
