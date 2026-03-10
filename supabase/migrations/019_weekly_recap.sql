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
  -- Rank ALL descriptions for each word in last week, then pick the user's rows
  WITH all_last_week AS (
    SELECT
      d.id,
      d.description,
      d.vote_count,
      d.user_id,
      dw.word,
      dw.date,
      ROW_NUMBER() OVER (PARTITION BY d.word_id ORDER BY d.vote_count DESC, d.created_at ASC) AS rank_in_word,
      COUNT(*) OVER (PARTITION BY d.word_id) AS total_in_word
    FROM descriptions d
    JOIN daily_words dw ON d.word_id = dw.id
    WHERE dw.language = p_language
      AND dw.date BETWEEN v_week_start AND v_week_end
  ),
  user_last_week AS (
    SELECT * FROM all_last_week WHERE user_id = p_user_id
  ),
  best AS (
    SELECT * FROM user_last_week
    ORDER BY rank_in_word ASC, total_in_word DESC
    LIMIT 1
  ),
  all_prev_week AS (
    SELECT
      d.user_id,
      ROW_NUMBER() OVER (PARTITION BY d.word_id ORDER BY d.vote_count DESC, d.created_at ASC) AS rank_in_word
    FROM descriptions d
    JOIN daily_words dw ON d.word_id = dw.id
    WHERE dw.language = p_language
      AND dw.date BETWEEN v_prev_week_start AND v_prev_week_end
  ),
  user_prev_week AS (
    SELECT * FROM all_prev_week WHERE user_id = p_user_id
  ),
  -- Aggregate user stats in one pass
  user_stats AS (
    SELECT
      COUNT(DISTINCT ulw.date)::INTEGER AS v_days_played,
      COALESCE(SUM(ulw.vote_count), 0)::INTEGER AS v_total_votes,
      ROUND(AVG(ulw.rank_in_word), 0) AS v_avg_rank,
      COUNT(*)::INTEGER AS v_total_descs
    FROM user_last_week ulw
  ),
  user_profile AS (
    SELECT p.current_streak FROM profiles p WHERE p.id = p_user_id
  )
  SELECT
    us.v_days_played,
    us.v_total_votes,
    (SELECT b.rank_in_word::INTEGER FROM best b),
    (SELECT b.word FROM best b),
    (SELECT b.description FROM best b),
    (SELECT b.total_in_word FROM best b),
    us.v_avg_rank,
    (SELECT ROUND(AVG(upw.rank_in_word), 0) FROM user_prev_week upw),
    (SELECT up.current_streak FROM user_profile up),
    us.v_total_descs,
    (us.v_days_played = 7),
    v_week_start,
    v_week_end
  FROM user_stats us;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
