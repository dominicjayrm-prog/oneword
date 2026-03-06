-- =============================================
-- Add language support to OneWord
-- =============================================

-- 1. Add language column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- 2. Add language column to daily_words
ALTER TABLE daily_words ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- 3. Replace the unique constraint on daily_words(date) with (date, language)
ALTER TABLE daily_words DROP CONSTRAINT IF EXISTS daily_words_date_key;
ALTER TABLE daily_words ADD CONSTRAINT daily_words_date_language_key UNIQUE (date, language);

-- 4. Update existing English words to have language = 'en'
UPDATE daily_words SET language = 'en' WHERE language IS NULL;

-- 5. Seed Spanish words (matching dates to existing English words)
INSERT INTO daily_words (word, date, category, language)
SELECT
  es_word, dw.date, es_category, 'es'
FROM daily_words dw
JOIN (VALUES
  ('RAIN', 'LLUVIA', 'naturaleza'),
  ('MONDAY', 'LUNES', 'vida'),
  ('SILENCE', 'SILENCIO', 'abstracto'),
  ('PIZZA', 'PIZZA', 'comida'),
  ('JEALOUSY', 'CELOS', 'emoci' || chr(243) || 'n'),
  ('KEYS', 'LLAVES', 'objetos'),
  ('CHILDHOOD', 'INFANCIA', 'abstracto'),
  ('WIFI', 'WIFI', 'moderno'),
  ('GRAVITY', 'GRAVEDAD', 'ciencia'),
  ('FRIDAY', 'VIERNES', 'vida'),
  ('OCEAN', 'OC' || chr(201) || 'ANO', 'naturaleza'),
  ('COFFEE', 'CAF' || chr(201), 'comida'),
  ('REGRET', 'ARREPENTIMIENTO', 'emoci' || chr(243) || 'n'),
  ('MIRROR', 'ESPEJO', 'objetos'),
  ('HOME', 'HOGAR', 'abstracto')
) AS mapping(en_word, es_word, es_category) ON dw.word = mapping.en_word AND dw.language = 'en'
ON CONFLICT (date, language) DO NOTHING;

-- 6. Update get_today_word to accept language parameter
CREATE OR REPLACE FUNCTION get_today_word(p_language TEXT DEFAULT 'en')
RETURNS TABLE(id UUID, word TEXT, category TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT dw.id, dw.word, dw.category
  FROM daily_words dw
  WHERE dw.date = CURRENT_DATE
  AND dw.language = p_language;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update get_vote_pair — descriptions are already scoped by word_id,
--    and since each language has its own word_id, the pairs are
--    automatically language-separated. No change needed to the function.

-- 8. Update handle_new_user to store language from metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || LEFT(NEW.id::TEXT, 8)),
    COALESCE(NEW.raw_user_meta_data->>'language', 'en')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
