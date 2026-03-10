-- =============================================
-- Vote security hardening + data integrity fixes
-- =============================================

-- 1. SECURITY: submit_vote must validate that winner/loser belong to the word
--    and that the voter is not voting on their own description.
--    Without this, a malicious user could craft RPC calls to manipulate
--    Elo ratings of descriptions from other words or boost their own ranking.
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
  -- Enforce that the caller is the voter
  IF auth.uid() != p_voter_id THEN
    RAISE EXCEPTION 'Forbidden: cannot vote as another user';
  END IF;

  -- Validate that both descriptions belong to the given word
  IF NOT EXISTS (SELECT 1 FROM descriptions WHERE id = p_winner_id AND word_id = p_word_id) THEN
    RAISE EXCEPTION 'Invalid winner description for this word';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM descriptions WHERE id = p_loser_id AND word_id = p_word_id) THEN
    RAISE EXCEPTION 'Invalid loser description for this word';
  END IF;

  -- Prevent voting on your own descriptions
  IF EXISTS (SELECT 1 FROM descriptions WHERE id = p_winner_id AND user_id = p_voter_id) THEN
    RAISE EXCEPTION 'Cannot vote on your own description';
  END IF;
  IF EXISTS (SELECT 1 FROM descriptions WHERE id = p_loser_id AND user_id = p_voter_id) THEN
    RAISE EXCEPTION 'Cannot vote on your own description';
  END IF;

  INSERT INTO votes (voter_id, word_id, winner_id, loser_id)
  VALUES (p_voter_id, p_word_id, p_winner_id, p_loser_id);

  -- Lock rows to prevent Elo race condition under concurrent voting
  SELECT elo_rating INTO v_winner_elo FROM descriptions WHERE id = p_winner_id FOR UPDATE;
  SELECT elo_rating INTO v_loser_elo FROM descriptions WHERE id = p_loser_id FOR UPDATE;

  v_expected_winner := 1.0 / (1.0 + POWER(10.0, (v_loser_elo - v_winner_elo) / 400.0));
  v_expected_loser := 1.0 / (1.0 + POWER(10.0, (v_winner_elo - v_loser_elo) / 400.0));

  UPDATE descriptions
  SET vote_count = vote_count + 1,
      elo_rating = elo_rating + v_k * (1.0 - v_expected_winner),
      matchup_count = matchup_count + 1
  WHERE id = p_winner_id;

  UPDATE descriptions
  SET elo_rating = elo_rating - v_k * v_expected_loser,
      matchup_count = matchup_count + 1
  WHERE id = p_loser_id;

  SELECT user_id INTO v_winner_user_id FROM descriptions WHERE id = p_winner_id;
  UPDATE profiles SET total_votes_received = total_votes_received + 1, updated_at = NOW()
  WHERE id = v_winner_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FIX: get_weekly_recap should not return a row when user didn't play
--    The aggregate CTE always produces one row even with no matching data,
--    causing the client to show a broken recap with all zeros.
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
  -- Last week: Monday to Sunday (based on game date)
  v_week_end := (date_trunc('week', game_date())::DATE) - 1;   -- last Sunday
  v_week_start := v_week_end - 6;                                -- last Monday

  -- Previous week for comparison
  v_prev_week_end := v_week_start - 1;
  v_prev_week_start := v_prev_week_end - 6;

  RETURN QUERY
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
    SELECT * FROM all_last_week WHERE all_last_week.user_id = p_user_id
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
    SELECT * FROM all_prev_week WHERE all_prev_week.user_id = p_user_id
  ),
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
  FROM user_stats us
  WHERE us.v_days_played > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
