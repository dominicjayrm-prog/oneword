-- =============================================
-- Content Moderation System
-- Shadow banning, duplicate detection, gibberish filtering,
-- moderation logging, and server-side validation.
-- =============================================

-- =============================================
-- 1. DATABASE CHANGES
-- =============================================

-- Add shadow ban columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_shadowbanned BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shadowbanned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shadowban_reason TEXT;

-- Ban audit log table
CREATE TABLE IF NOT EXISTS ban_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL, -- 'shadowban', 'unshadowban'
  reason TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ban_log ENABLE ROW LEVEL SECURITY;
-- No public policies — admin panel uses service role

-- Moderation log for blocked submissions
CREATE TABLE IF NOT EXISTS moderation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  word_id UUID REFERENCES daily_words(id),
  attempted_description TEXT,
  rejection_reason TEXT, -- 'profanity', 'gibberish', 'duplicate', 'spam'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;
-- No public policies — admin panel uses service role

-- =============================================
-- 2. SHADOW BAN: Modify get_vote_pair
-- Exclude shadowbanned users from voting pairs
-- =============================================
DROP FUNCTION IF EXISTS get_vote_pair(UUID, UUID);

CREATE FUNCTION get_vote_pair(p_word_id UUID, p_voter_id UUID)
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
  WITH eligible AS (
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
  ),
  voted_pairs AS (
    SELECT v.winner_id, v.loser_id
    FROM votes v
    WHERE v.voter_id = p_voter_id AND v.word_id = p_word_id
  ),
  available_pairs AS (
    SELECT
      a.id AS a_id, a.description AS a_desc, a.username AS a_user, a.badge_emoji AS a_badge,
      b.id AS b_id, b.description AS b_desc, b.username AS b_user, b.badge_emoji AS b_badge
    FROM eligible a
    CROSS JOIN eligible b
    WHERE a.id < b.id
    AND NOT EXISTS (
      SELECT 1 FROM voted_pairs vp
      WHERE (vp.winner_id = a.id AND vp.loser_id = b.id)
         OR (vp.winner_id = b.id AND vp.loser_id = a.id)
    )
  )
  SELECT a_id, a_desc, a_user, a_badge, b_id, b_desc, b_user, b_badge
  FROM available_pairs
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. SHADOW BAN: Modify get_leaderboard
-- Exclude shadowbanned users, but the requesting user
-- always sees their own entry if they are shadowbanned.
-- =============================================
DROP FUNCTION IF EXISTS get_leaderboard(UUID, INTEGER);

CREATE FUNCTION get_leaderboard(p_word_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  description_id UUID,
  description_text TEXT,
  username TEXT,
  votes BIGINT,
  rank BIGINT,
  streak_badge_emoji TEXT
) AS $$
DECLARE
  v_requesting_user_id UUID;
BEGIN
  v_requesting_user_id := auth.uid();

  -- Update best_rank for all users who submitted for this word
  WITH ranked AS (
    SELECT d.user_id, ROW_NUMBER() OVER (ORDER BY d.vote_count DESC, d.created_at ASC) AS r
    FROM descriptions d
    WHERE d.word_id = p_word_id
  )
  UPDATE profiles p
  SET best_rank = LEAST(COALESCE(p.best_rank, ranked.r::INTEGER), ranked.r::INTEGER),
      updated_at = NOW()
  FROM ranked
  WHERE p.id = ranked.user_id;

  -- Return leaderboard excluding shadowbanned users
  -- (but always include the requesting user's own entry)
  RETURN QUERY
  SELECT
    d.id AS description_id,
    d.description AS description_text,
    p.username,
    d.vote_count::BIGINT AS votes,
    ROW_NUMBER() OVER (ORDER BY d.vote_count DESC, d.created_at ASC) AS rank,
    p.streak_badge_emoji
  FROM descriptions d
  JOIN profiles p ON d.user_id = p.id
  WHERE d.word_id = p_word_id
  AND (p.is_shadowbanned = false OR d.user_id = v_requesting_user_id)
  ORDER BY d.vote_count DESC, d.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. SHADOW BAN: Modify get_friends_descriptions
-- Exclude shadowbanned friends' descriptions
-- =============================================
CREATE OR REPLACE FUNCTION get_friends_descriptions(p_user_id UUID, p_word_id UUID)
RETURNS TABLE(
  friend_id UUID,
  friend_username TEXT,
  friend_avatar_url TEXT,
  description_text TEXT,
  vote_count INTEGER,
  elo_rating DECIMAL,
  friend_streak INTEGER,
  has_played BOOLEAN
) AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot read another user''s friends descriptions';
  END IF;

  -- Check if user has submitted their own description
  IF NOT EXISTS (
    SELECT 1 FROM descriptions WHERE user_id = p_user_id AND word_id = p_word_id
  ) THEN
    RETURN QUERY
    SELECT
      CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END,
      p.username,
      p.avatar_url,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::DECIMAL,
      p.current_streak,
      FALSE
    FROM friendships f
    JOIN profiles p ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
    WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
    AND f.status = 'accepted'
    AND p.is_shadowbanned = false;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    d.description,
    d.vote_count,
    d.elo_rating,
    p.current_streak,
    TRUE
  FROM friendships f
  JOIN profiles p ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
  LEFT JOIN descriptions d ON d.user_id = p.id AND d.word_id = p_word_id
  WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
  AND f.status = 'accepted'
  AND p.is_shadowbanned = false
  ORDER BY d.elo_rating DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. SHADOW BAN: Modify get_yesterday_winner
-- Exclude shadowbanned users from being shown as winners
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
-- 6. SERVER-SIDE VALIDATION FUNCTION
-- Validates descriptions before insertion for:
-- duplicate check, gibberish, spam, profanity
-- =============================================
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

  -- Duplicate check: same description already exists for this word
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
    -- User already submitted for this word
    RETURN QUERY SELECT false, 'ALREADY_SUBMITTED'::TEXT,
      'You have already submitted a description for this word'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_shadowbanned ON profiles(is_shadowbanned) WHERE is_shadowbanned = true;
CREATE INDEX IF NOT EXISTS idx_ban_log_user_id ON ban_log(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_log_user_id ON moderation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_log_created_at ON moderation_log(created_at DESC);
