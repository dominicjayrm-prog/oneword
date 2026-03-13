-- =============================================
-- Fix: handle username uniqueness properly
-- 1. validate_and_submit_description self-heal now handles username conflicts
-- 2. handle_new_user trigger improved error handling
-- =============================================

-- Fix validate_and_submit_description: the self-heal INSERT can fail
-- if the username from auth metadata is already taken by another user.
-- ON CONFLICT (id) only handles id conflicts, not username conflicts.
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
  v_desired_username TEXT;
BEGIN
  -- Enforce that the caller is the user
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RETURN QUERY SELECT false, 'FORBIDDEN'::TEXT, 'Cannot submit as another user'::TEXT;
    RETURN;
  END IF;

  -- Ensure the user has a profile row (self-heal if trigger missed it)
  -- Pull the intended username from auth.users metadata when available,
  -- but fall back to a unique player_ name if that username is already taken.
  v_desired_username := COALESCE(
    (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = p_user_id),
    'player_' || LEFT(p_user_id::TEXT, 8)
  );

  -- Check if the desired username is already taken by another user
  IF EXISTS (SELECT 1 FROM profiles WHERE username = v_desired_username AND id != p_user_id) THEN
    v_desired_username := 'player_' || LEFT(p_user_id::TEXT, 12);
  END IF;

  BEGIN
    INSERT INTO profiles (id, username)
    VALUES (p_user_id, v_desired_username)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN unique_violation THEN
      -- Username still conflicts somehow, try with full UUID prefix
      BEGIN
        INSERT INTO profiles (id, username)
        VALUES (p_user_id, 'player_' || LEFT(p_user_id::TEXT, 12))
        ON CONFLICT (id) DO NOTHING;
      EXCEPTION
        WHEN unique_violation THEN
          -- Last resort: use full UUID
          INSERT INTO profiles (id, username)
          VALUES (p_user_id, 'player_' || p_user_id::TEXT)
          ON CONFLICT (id) DO NOTHING;
      END;
  END;

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

-- Also improve handle_new_user trigger to be more robust with username conflicts
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || LEFT(NEW.id::TEXT, 8));

  -- Check if the desired username is already taken
  IF EXISTS (SELECT 1 FROM profiles WHERE username = v_username AND id != NEW.id) THEN
    v_username := 'player_' || LEFT(NEW.id::TEXT, 12);
  END IF;

  INSERT INTO profiles (id, username, language)
  VALUES (
    NEW.id,
    v_username,
    COALESCE(NEW.raw_user_meta_data->>'language', 'en')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Username still conflicts, use a more unique fallback
    BEGIN
      INSERT INTO profiles (id, username, language)
      VALUES (
        NEW.id,
        'player_' || NEW.id::TEXT,
        COALESCE(NEW.raw_user_meta_data->>'language', 'en')
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user fallback failed for %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
