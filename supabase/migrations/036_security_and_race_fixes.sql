-- =============================================
-- Security fix + race condition fixes
-- =============================================

-- =============================================
-- 1. SECURITY: Add auth.uid() checks to get_yesterday_winner
-- The function accepts p_user_id but never verified the caller.
-- Any authenticated user could query another user's results.
-- =============================================
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
  -- Enforce that the caller is the user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot read another user''s yesterday results';
  END IF;

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
  WITH all_ranked AS (
    SELECT
      d.description,
      p.username,
      d.vote_count,
      d.user_id,
      p.is_shadowbanned,
      ROW_NUMBER() OVER (ORDER BY d.vote_count DESC, d.created_at ASC) as rnk,
      COUNT(*) OVER () as total
    FROM descriptions d
    JOIN profiles p ON d.user_id = p.id
    WHERE d.word_id = yesterday_word_id
  ),
  winner AS (
    SELECT * FROM all_ranked WHERE rnk = 1 AND is_shadowbanned = false
  ),
  user_entry AS (
    SELECT * FROM all_ranked WHERE user_id = p_user_id
  )
  SELECT
    yesterday_word,
    yesterday_category,
    w.description,
    w.username,
    w.vote_count,
    ue.description,
    ue.rnk,
    COALESCE(w.total, ue.total),
    COALESCE(w.user_id = p_user_id, FALSE)
  FROM user_entry ue
  FULL OUTER JOIN winner w ON TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. SECURITY: Add auth.uid() check to get_weekly_recap
-- Same issue: accepted arbitrary p_user_id without verification.
-- =============================================
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
  -- Enforce that the caller is the user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot read another user''s weekly recap';
  END IF;

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

-- =============================================
-- 3. RACE CONDITION FIX: update_streak double-increment
-- The function reads profile data without FOR UPDATE, so two
-- concurrent calls can both see last_played_date != today and
-- both increment the streak. Fix by locking the profile row.
-- =============================================
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_played DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_total_plays INTEGER;
  v_badge_emoji TEXT;
  v_badge_name TEXT;
BEGIN
  -- Enforce that only the user (or seed system) can update their own streak
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot update another user''s streak';
  END IF;

  -- Lock the profile row to prevent concurrent streak updates
  SELECT last_played_date, current_streak, longest_streak, total_plays
  INTO v_last_played, v_current_streak, v_longest_streak, v_total_plays
  FROM profiles WHERE id = p_user_id
  FOR UPDATE;

  IF v_last_played = game_date() THEN
    RETURN;
  END IF;

  IF v_last_played = game_date() - 1 THEN
    v_current_streak := v_current_streak + 1;
  ELSE
    v_current_streak := 1;
  END IF;

  SELECT sb.emoji, sb.name INTO v_badge_emoji, v_badge_name
  FROM get_streak_badge(v_current_streak) sb;

  UPDATE profiles SET
    current_streak = v_current_streak,
    longest_streak = GREATEST(v_longest_streak, v_current_streak),
    total_plays = v_total_plays + 1,
    last_played_date = game_date(),
    streak_badge_emoji = v_badge_emoji,
    streak_badge_name = v_badge_name,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. RACE CONDITION FIX: Duplicate description TOCTOU
-- validate_and_submit_description checks for duplicate content
-- with IF EXISTS then INSERTs separately. Two concurrent users
-- can both pass the check and both insert the same description.
-- Fix: add a unique index on (word_id, normalized description)
-- so the DB enforces uniqueness atomically.
-- =============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_descriptions_unique_content
  ON descriptions (word_id, LOWER(TRIM(description)));

-- Update validate_and_submit_description to handle the new
-- unique constraint violation for content duplicates.
CREATE OR REPLACE FUNCTION validate_and_submit_description(
  p_user_id UUID,
  p_word_id UUID,
  p_description TEXT
) RETURNS TABLE(
  success BOOLEAN,
  error_code TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_words TEXT[];
  v_word TEXT;
  v_unique_words TEXT[];
  v_cleaned TEXT;
  v_word_count INTEGER;
  v_max_count INTEGER;
  v_vowel_whitelist TEXT[] := ARRAY[
    'rhythm', 'hymn', 'shy', 'fly', 'cry', 'dry', 'gym', 'myth', 'lynx',
    'my', 'by', 'try', 'fry', 'why', 'sky', 'spy', 'sly', 'thy', 'wry',
    'crypt', 'glyph', 'nymph', 'psych', 'sync', 'syzygy', 'pygmy', 'tryst'
  ];
  v_single_letter_en TEXT[] := ARRAY['i', 'a'];
  v_single_letter_es TEXT[] := ARRAY['y', 'a', 'o', 'e', 'u'];
  v_language TEXT;
  v_single_allowed TEXT[];
BEGIN
  -- Enforce that the caller is the user
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RETURN QUERY SELECT false, 'FORBIDDEN'::TEXT, 'Cannot submit as another user'::TEXT;
    RETURN;
  END IF;

  -- Ensure the user has a profile row (self-heal if trigger missed it)
  INSERT INTO profiles (id, username)
  VALUES (
    p_user_id,
    COALESCE(
      (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = p_user_id),
      'player_' || LEFT(p_user_id::TEXT, 8)
    )
  )
  ON CONFLICT (id) DO NOTHING;

  -- Get language for this word
  SELECT dw.language INTO v_language FROM daily_words dw WHERE dw.id = p_word_id;
  IF v_language = 'es' THEN
    v_single_allowed := v_single_letter_es;
  ELSE
    v_single_allowed := v_single_letter_en;
  END IF;

  -- Clean and split
  v_cleaned := LOWER(TRIM(p_description));
  v_words := regexp_split_to_array(v_cleaned, '\s+');
  v_word_count := array_length(v_words, 1);

  -- Must be exactly 5 words
  IF v_word_count IS NULL OR v_word_count != 5 THEN
    RETURN QUERY SELECT false, 'INVALID_WORD_COUNT'::TEXT, 'Description must be exactly 5 words'::TEXT;
    RETURN;
  END IF;

  -- Per-word validation
  FOR i IN 1..5 LOOP
    v_word := v_words[i];

    -- Min length: 2 chars (unless allowed single letter)
    IF length(v_word) < 2 AND NOT (v_word = ANY(v_single_allowed)) THEN
      INSERT INTO moderation_log (user_id, word_id, attempted_description, rejection_reason)
      VALUES (p_user_id, p_word_id, TRIM(p_description), 'gibberish');
      RETURN QUERY SELECT false, 'INVALID_WORD_LENGTH'::TEXT,
        format('Word "%s" is too short (min 2 characters)', v_word);
      RETURN;
    END IF;

    -- Max length: 15 chars
    IF length(v_word) > 15 THEN
      INSERT INTO moderation_log (user_id, word_id, attempted_description, rejection_reason)
      VALUES (p_user_id, p_word_id, TRIM(p_description), 'gibberish');
      RETURN QUERY SELECT false, 'INVALID_WORD_LENGTH'::TEXT,
        format('Word "%s" is too long (max 15 characters)', v_word);
      RETURN;
    END IF;

    -- Must contain a vowel (a, e, i, o, u, y) unless whitelisted
    IF NOT (v_word ~ '[aeiouyáéíóú]') AND NOT (v_word = ANY(v_vowel_whitelist)) THEN
      INSERT INTO moderation_log (user_id, word_id, attempted_description, rejection_reason)
      VALUES (p_user_id, p_word_id, TRIM(p_description), 'gibberish');
      RETURN QUERY SELECT false, 'GIBBERISH_DETECTED'::TEXT,
        format('"%s" does not look like a real word', v_word);
      RETURN;
    END IF;

    -- No more than 3 consecutive same characters
    IF v_word ~ '(.)\1{3,}' THEN
      INSERT INTO moderation_log (user_id, word_id, attempted_description, rejection_reason)
      VALUES (p_user_id, p_word_id, TRIM(p_description), 'gibberish');
      RETURN QUERY SELECT false, 'GIBBERISH_DETECTED'::TEXT,
        format('"%s" contains too many repeated characters', v_word);
      RETURN;
    END IF;
  END LOOP;

  -- All 5 words cannot be identical
  v_unique_words := ARRAY(SELECT DISTINCT unnest(v_words));
  IF array_length(v_unique_words, 1) = 1 THEN
    INSERT INTO moderation_log (user_id, word_id, attempted_description, rejection_reason)
    VALUES (p_user_id, p_word_id, TRIM(p_description), 'spam');
    RETURN QUERY SELECT false, 'TOO_MANY_REPEATS'::TEXT,
      'All five words cannot be the same'::TEXT;
    RETURN;
  END IF;

  -- Must have at least 3 unique words
  IF array_length(v_unique_words, 1) < 3 THEN
    INSERT INTO moderation_log (user_id, word_id, attempted_description, rejection_reason)
    VALUES (p_user_id, p_word_id, TRIM(p_description), 'spam');
    RETURN QUERY SELECT false, 'TOO_MANY_REPEATS'::TEXT,
      'Description must have at least 3 unique words'::TEXT;
    RETURN;
  END IF;

  -- No word can appear more than twice
  FOR i IN 1..array_length(v_unique_words, 1) LOOP
    v_max_count := 0;
    FOR j IN 1..5 LOOP
      IF v_words[j] = v_unique_words[i] THEN
        v_max_count := v_max_count + 1;
      END IF;
    END LOOP;
    IF v_max_count > 2 THEN
      INSERT INTO moderation_log (user_id, word_id, attempted_description, rejection_reason)
      VALUES (p_user_id, p_word_id, TRIM(p_description), 'spam');
      RETURN QUERY SELECT false, 'TOO_MANY_REPEATS'::TEXT,
        format('"%s" appears too many times', v_unique_words[i]);
      RETURN;
    END IF;
  END LOOP;

  -- Duplicate check is now enforced by unique index (idx_descriptions_unique_content).
  -- We still do the soft check here for a friendly error message, but the index
  -- is the authoritative guard against the TOCTOU race.
  IF EXISTS (
    SELECT 1 FROM descriptions
    WHERE word_id = p_word_id
    AND LOWER(TRIM(description)) = v_cleaned
  ) THEN
    INSERT INTO moderation_log (user_id, word_id, attempted_description, rejection_reason)
    VALUES (p_user_id, p_word_id, TRIM(p_description), 'duplicate');
    RETURN QUERY SELECT false, 'DUPLICATE_DESCRIPTION'::TEXT,
      'This description has already been submitted'::TEXT;
    RETURN;
  END IF;

  -- All validations passed — insert the description
  INSERT INTO descriptions (user_id, word_id, description)
  VALUES (p_user_id, p_word_id, TRIM(p_description));

  RETURN QUERY SELECT true, NULL::TEXT, NULL::TEXT;

EXCEPTION
  WHEN unique_violation THEN
    -- Could be either: user already submitted (user_id, word_id) constraint,
    -- or duplicate content (word_id, lower(trim(description))) constraint.
    -- Both should return a user-friendly message.
    IF SQLERRM LIKE '%idx_descriptions_unique_content%' OR
       SQLERRM LIKE '%lower%' THEN
      INSERT INTO moderation_log (user_id, word_id, attempted_description, rejection_reason)
      VALUES (p_user_id, p_word_id, TRIM(p_description), 'duplicate');
      RETURN QUERY SELECT false, 'DUPLICATE_DESCRIPTION'::TEXT,
        'This description has already been submitted'::TEXT;
    ELSE
      RETURN QUERY SELECT false, 'ALREADY_SUBMITTED'::TEXT,
        'You have already submitted a description for this word'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
