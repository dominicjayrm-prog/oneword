-- =============================================
-- Global word rollover at 5am UTC
-- =============================================
-- Changes the daily word boundary from UTC midnight to 5am UTC.
-- This means the "game date" is (NOW() - 5 hours)::date.
-- Everyone sees the same game day regardless of timezone.

-- Step 1: Create the game_date() helper
CREATE OR REPLACE FUNCTION game_date()
RETURNS DATE AS $$
BEGIN
  RETURN (NOW() - INTERVAL '5 hours')::date;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 2: Update get_today_word to use game_date()
CREATE OR REPLACE FUNCTION get_today_word(p_language TEXT DEFAULT 'en')
RETURNS TABLE(id UUID, word TEXT, category TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT dw.id, dw.word, dw.category
  FROM daily_words dw
  WHERE dw.date = game_date()
  AND dw.language = p_language;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Update update_streak to use game_date() instead of per-user timezone.
-- The game day boundary is the same for everyone (5am UTC), so streak logic
-- should use game_date() for consistency with word rollover.
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_played DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE;
BEGIN
  SELECT last_played_date, current_streak, longest_streak
  INTO v_last_played, v_current_streak, v_longest_streak
  FROM profiles
  WHERE id = p_user_id;

  -- Use the global game date (5am UTC rollover)
  v_today := game_date();

  -- Already played today, no update needed
  IF v_last_played = v_today THEN
    RETURN;
  END IF;

  IF v_last_played = v_today - 1 THEN
    -- Played yesterday (game day): extend streak
    v_current_streak := v_current_streak + 1;
  ELSE
    -- Missed a day (or first time): reset streak to 1
    v_current_streak := 1;
  END IF;

  -- Update longest streak if current exceeds it
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  UPDATE profiles
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      total_plays = total_plays + 1,
      last_played_date = v_today,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update get_yesterday_winner to use game_date()
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
  -- Get yesterday's word (game day - 1)
  SELECT dw.id, dw.word, dw.category
  INTO yesterday_word_id, yesterday_word, yesterday_category
  FROM daily_words dw
  WHERE dw.date = game_date() - 1
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

-- Step 5: Update get_weekly_recap to use game_date()
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

-- Step 6: Update seed-related functions to use game_date()

CREATE OR REPLACE FUNCTION create_seed_profile(
  p_user_id UUID,
  p_username TEXT,
  p_avatar_url TEXT,
  p_language TEXT,
  p_streak INTEGER,
  p_total_plays INTEGER
) RETURNS void AS $$
BEGIN
  INSERT INTO profiles (
    id, username, avatar_url, language,
    current_streak, longest_streak, total_plays,
    last_played_date, is_seed_account, created_at, updated_at
  ) VALUES (
    p_user_id, p_username, p_avatar_url, p_language,
    p_streak, p_streak, p_total_plays,
    game_date() - 1, TRUE, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    language = EXCLUDED.language,
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    total_plays = EXCLUDED.total_plays,
    is_seed_account = TRUE,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Update seed_coverage_report to use game_date()
CREATE OR REPLACE FUNCTION seed_coverage_report(p_language TEXT DEFAULT NULL)
RETURNS TABLE(
  word TEXT,
  language TEXT,
  word_date DATE,
  total_descriptions BIGINT,
  unused_descriptions BIGINT,
  accounts_covered BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dw.word,
    dw.language,
    dw.date,
    COUNT(sd.id),
    COUNT(sd.id) FILTER (WHERE sd.used = FALSE),
    COUNT(DISTINCT sd.seed_account_index) FILTER (WHERE sd.used = FALSE)
  FROM daily_words dw
  LEFT JOIN seed_descriptions sd ON sd.word = dw.word AND sd.language = dw.language
  WHERE dw.date >= game_date()
  AND (p_language IS NULL OR dw.language = p_language)
  GROUP BY dw.word, dw.language, dw.date
  ORDER BY dw.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Update assign_words_from_pool to use game_date()
CREATE OR REPLACE FUNCTION assign_words_from_pool(p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE(assigned_date DATE, assigned_word TEXT, assigned_language TEXT) AS $$
DECLARE
  v_date DATE;
  v_lang TEXT;
  v_word_row RECORD;
BEGIN
  FOR v_lang IN SELECT DISTINCT wp.language FROM word_pool wp
  LOOP
    FOR v_date IN SELECT generate_series(game_date(), game_date() + p_days_ahead, '1 day'::interval)::date
    LOOP
      -- Skip if a word already exists for this date+language
      IF EXISTS (SELECT 1 FROM daily_words dw WHERE dw.date = v_date AND dw.language = v_lang) THEN
        CONTINUE;
      END IF;

      -- Pick a random unused word from the pool
      SELECT wp.id, wp.word, wp.category INTO v_word_row
      FROM word_pool wp
      WHERE wp.language = v_lang AND wp.used = FALSE
      ORDER BY RANDOM()
      LIMIT 1;

      -- If no unused words left, recycle: reset all words to unused
      IF v_word_row IS NULL THEN
        UPDATE word_pool SET used = FALSE WHERE word_pool.language = v_lang;
        SELECT wp.id, wp.word, wp.category INTO v_word_row
        FROM word_pool wp
        WHERE wp.language = v_lang AND wp.used = FALSE
        ORDER BY RANDOM()
        LIMIT 1;
      END IF;

      -- Still nothing? Skip this language entirely
      IF v_word_row IS NULL THEN
        CONTINUE;
      END IF;

      -- Insert the daily word
      INSERT INTO daily_words (word, date, category, language)
      VALUES (v_word_row.word, v_date, v_word_row.category, v_lang)
      ON CONFLICT (date, language) DO NOTHING;

      -- Mark pool word as used
      UPDATE word_pool SET used = TRUE WHERE word_pool.id = v_word_row.id;

      assigned_date := v_date;
      assigned_word := v_word_row.word;
      assigned_language := v_lang;
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Update the cron job to run at 5am UTC instead of midnight
-- (The function uses game_date() now, but the cron should run at rollover time)
SELECT cron.unschedule('assign-daily-words');
SELECT cron.schedule(
  'assign-daily-words',
  '0 5 * * *',
  $$SELECT * FROM assign_words_from_pool(30);$$
);

-- Step 10: Also fix get_vote_pair to merge pair-based matching (013) with report filtering (020)
-- Migration 020 accidentally reverted to individual-description exclusion instead of pair-based.
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
