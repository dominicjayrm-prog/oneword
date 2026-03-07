-- =============================================
-- Seed accounts & auto-submission system
-- =============================================

-- 1. Add is_seed_account flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_seed_account BOOLEAN DEFAULT FALSE;

-- 2. Table to store pre-written seed descriptions
CREATE TABLE seed_descriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'es')),
  description TEXT NOT NULL,
  seed_account_index INTEGER NOT NULL CHECK (seed_account_index BETWEEN 1 AND 16),
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups during daily submission
CREATE INDEX idx_seed_word_lang ON seed_descriptions(word, language, used);

-- RLS: only service role / edge functions should access this table
ALTER TABLE seed_descriptions ENABLE ROW LEVEL SECURITY;
-- No public policies — only SECURITY DEFINER functions or service_role can read/write

-- 3. Update search_users to hide seed accounts
CREATE OR REPLACE FUNCTION search_users(p_query TEXT, p_current_user UUID)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  current_streak INTEGER,
  is_friend BOOLEAN,
  request_pending BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    p.current_streak,
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE ((f.requester_id = p_current_user AND f.addressee_id = p.id)
        OR (f.addressee_id = p_current_user AND f.requester_id = p.id))
      AND f.status = 'accepted'
    ),
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE ((f.requester_id = p_current_user AND f.addressee_id = p.id)
        OR (f.addressee_id = p_current_user AND f.requester_id = p.id))
      AND f.status = 'pending'
    )
  FROM profiles p
  WHERE p.username ILIKE '%' || p_query || '%'
  AND p.id != p_current_user
  AND p.is_seed_account = FALSE
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Helper function: create a single seed account profile
-- (Used by the edge function after creating the auth user)
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
    CURRENT_DATE - 1, TRUE, NOW(), NOW()
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

-- 5. Function to submit a seed description for today
-- Inserts into the real descriptions table, updates streak/stats
CREATE OR REPLACE FUNCTION submit_seed_description(
  p_seed_user_id UUID,
  p_word_id UUID,
  p_description TEXT
) RETURNS void AS $$
BEGIN
  -- Insert description (skip if already exists for this user+word)
  INSERT INTO descriptions (user_id, word_id, description)
  VALUES (p_seed_user_id, p_word_id, p_description)
  ON CONFLICT (user_id, word_id) DO NOTHING;

  -- Update streak and stats
  PERFORM update_streak(p_seed_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to import seed descriptions in bulk
-- Validates exactly 5 words per description
CREATE OR REPLACE FUNCTION import_seed_descriptions(
  p_items JSONB
) RETURNS TABLE(imported INTEGER, skipped INTEGER) AS $$
DECLARE
  v_item JSONB;
  v_imported INTEGER := 0;
  v_skipped INTEGER := 0;
  v_word_count INTEGER;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Validate exactly 5 words
    v_word_count := array_length(
      regexp_split_to_array(trim(v_item->>'description'), '\s+'), 1
    );

    IF v_word_count != 5 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO seed_descriptions (word, language, description, seed_account_index)
    VALUES (
      upper(trim(v_item->>'word')),
      lower(trim(v_item->>'language')),
      trim(v_item->>'description'),
      (v_item->>'seed_account_index')::INTEGER
    )
    ON CONFLICT DO NOTHING;

    v_imported := v_imported + 1;
  END LOOP;

  RETURN QUERY SELECT v_imported, v_skipped;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to get seed accounts for a language
CREATE OR REPLACE FUNCTION get_seed_accounts(p_language TEXT)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  seed_index INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.username,
    -- Derive index from the account's position when ordered by username
    ROW_NUMBER() OVER (ORDER BY p.created_at)::INTEGER as seed_index
  FROM profiles p
  WHERE p.is_seed_account = TRUE
  AND p.language = p_language
  ORDER BY p.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to get an unused seed description
CREATE OR REPLACE FUNCTION get_unused_seed_description(
  p_word TEXT,
  p_language TEXT,
  p_seed_index INTEGER
) RETURNS TABLE(id UUID, description TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT sd.id, sd.description
  FROM seed_descriptions sd
  WHERE sd.word = upper(p_word)
  AND sd.language = p_language
  AND sd.seed_account_index = p_seed_index
  AND sd.used = FALSE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Mark a seed description as used
CREATE OR REPLACE FUNCTION mark_seed_used(p_seed_desc_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE seed_descriptions SET used = TRUE WHERE id = p_seed_desc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Seed coverage report: which words have descriptions ready
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
  WHERE dw.date >= CURRENT_DATE
  AND (p_language IS NULL OR dw.language = p_language)
  GROUP BY dw.word, dw.language, dw.date
  ORDER BY dw.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
