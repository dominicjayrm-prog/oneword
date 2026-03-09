-- =============================================
-- Backend fixes: indexes, injection, vote dedup, word pool
-- =============================================

-- =============================================
-- 1. Add indexes on votes table for get_vote_pair performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_votes_voter_word ON votes(voter_id, word_id);
CREATE INDEX IF NOT EXISTS idx_votes_winner ON votes(winner_id);
CREATE INDEX IF NOT EXISTS idx_votes_loser ON votes(loser_id);

-- =============================================
-- 2. Add index on descriptions(word_id, user_id) for faster lookups
-- =============================================
-- The UNIQUE(user_id, word_id) constraint creates an index on (user_id, word_id),
-- but queries often filter by word_id first, so we need this reversed index.
CREATE INDEX IF NOT EXISTS idx_descriptions_word_user ON descriptions(word_id, user_id);

-- =============================================
-- 3. Fix search_users ILIKE injection
-- A user searching for '%' or '_' would match everyone.
-- Escape special ILIKE characters before interpolation.
-- =============================================
CREATE OR REPLACE FUNCTION search_users(p_query TEXT, p_current_user UUID)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  current_streak INTEGER,
  is_friend BOOLEAN,
  request_pending BOOLEAN
) AS $$
DECLARE
  v_safe_query TEXT;
BEGIN
  -- Escape ILIKE special characters: % _ \
  v_safe_query := regexp_replace(p_query, '([%_\\])', '\\\1', 'g');

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
  WHERE p.username ILIKE '%' || v_safe_query || '%'
  AND p.id != p_current_user
  AND p.is_seed_account = FALSE
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. Prevent duplicate votes on the same pair
-- A unique constraint ensures a voter can only vote once per pair (in either direction).
-- We use a check constraint to normalize ordering (smaller UUID first).
-- =============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_unique_pair
  ON votes(voter_id, word_id, LEAST(winner_id, loser_id), GREATEST(winner_id, loser_id));

-- =============================================
-- 5. Word pool system — prevents running out of daily words
-- A large pool of words that get auto-assigned to future dates.
-- =============================================

-- Word pool table: a bank of words to draw from
CREATE TABLE IF NOT EXISTS word_pool (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  category TEXT DEFAULT 'general',
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(word, language)
);

ALTER TABLE word_pool ENABLE ROW LEVEL SECURITY;
-- No public access — only SECURITY DEFINER functions or service_role

-- Index for fast lookups of unused words
CREATE INDEX IF NOT EXISTS idx_word_pool_unused ON word_pool(language, used) WHERE used = FALSE;

-- Seed the word pool with a large set of words (English)
INSERT INTO word_pool (word, language, category) VALUES
  -- Nature
  ('SUNSET', 'en', 'nature'), ('THUNDER', 'en', 'nature'), ('FOREST', 'en', 'nature'),
  ('MOUNTAIN', 'en', 'nature'), ('RIVER', 'en', 'nature'), ('DESERT', 'en', 'nature'),
  ('SNOWFALL', 'en', 'nature'), ('RAINBOW', 'en', 'nature'), ('VOLCANO', 'en', 'nature'),
  ('STORM', 'en', 'nature'), ('TIDE', 'en', 'nature'), ('DAWN', 'en', 'nature'),
  ('BREEZE', 'en', 'nature'), ('FROST', 'en', 'nature'), ('WILDFIRE', 'en', 'nature'),
  -- Emotion
  ('HOPE', 'en', 'emotion'), ('FEAR', 'en', 'emotion'), ('JOY', 'en', 'emotion'),
  ('ANGER', 'en', 'emotion'), ('LOVE', 'en', 'emotion'), ('GRIEF', 'en', 'emotion'),
  ('PRIDE', 'en', 'emotion'), ('SHAME', 'en', 'emotion'), ('WONDER', 'en', 'emotion'),
  ('ENVY', 'en', 'emotion'), ('TRUST', 'en', 'emotion'), ('DOUBT', 'en', 'emotion'),
  ('NOSTALGIA', 'en', 'emotion'), ('COURAGE', 'en', 'emotion'), ('LONELINESS', 'en', 'emotion'),
  -- Life
  ('SLEEP', 'en', 'life'), ('DREAM', 'en', 'life'), ('WEDDING', 'en', 'life'),
  ('BIRTHDAY', 'en', 'life'), ('VACATION', 'en', 'life'), ('MORNING', 'en', 'life'),
  ('WEEKEND', 'en', 'life'), ('FAMILY', 'en', 'life'), ('FRIENDSHIP', 'en', 'life'),
  ('SCHOOL', 'en', 'life'), ('WORK', 'en', 'life'), ('MONEY', 'en', 'life'),
  ('SUCCESS', 'en', 'life'), ('FAILURE', 'en', 'life'), ('CHANGE', 'en', 'life'),
  -- Food
  ('CHOCOLATE', 'en', 'food'), ('BREAKFAST', 'en', 'food'), ('SUSHI', 'en', 'food'),
  ('TACOS', 'en', 'food'), ('ICE CREAM', 'en', 'food'), ('PASTA', 'en', 'food'),
  ('CHEESE', 'en', 'food'), ('BREAD', 'en', 'food'), ('CAKE', 'en', 'food'),
  ('SOUP', 'en', 'food'), ('WINE', 'en', 'food'), ('SPICE', 'en', 'food'),
  -- Objects / Modern
  ('PHONE', 'en', 'modern'), ('CAMERA', 'en', 'modern'), ('CLOCK', 'en', 'modern'),
  ('MUSIC', 'en', 'modern'), ('BOOK', 'en', 'modern'), ('DOOR', 'en', 'modern'),
  ('WINDOW', 'en', 'modern'), ('SHADOW', 'en', 'objects'), ('CANDLE', 'en', 'objects'),
  ('LADDER', 'en', 'objects'), ('UMBRELLA', 'en', 'objects'), ('MASK', 'en', 'objects'),
  -- Abstract
  ('TIME', 'en', 'abstract'), ('FREEDOM', 'en', 'abstract'), ('TRUTH', 'en', 'abstract'),
  ('POWER', 'en', 'abstract'), ('CHAOS', 'en', 'abstract'), ('PEACE', 'en', 'abstract'),
  ('LUCK', 'en', 'abstract'), ('FATE', 'en', 'abstract'), ('BEAUTY', 'en', 'abstract'),
  ('RISK', 'en', 'abstract'), ('SECRET', 'en', 'abstract'), ('PATIENCE', 'en', 'abstract'),
  -- Science
  ('SPACE', 'en', 'science'), ('LIGHT', 'en', 'science'), ('FIRE', 'en', 'science'),
  ('WATER', 'en', 'science'), ('EARTH', 'en', 'science'), ('ENERGY', 'en', 'science'),
  ('SPEED', 'en', 'science'), ('DNA', 'en', 'science'), ('ATOM', 'en', 'science')
ON CONFLICT (word, language) DO NOTHING;

-- Seed the word pool with Spanish words
INSERT INTO word_pool (word, language, category) VALUES
  -- Naturaleza
  ('ATARDECER', 'es', 'naturaleza'), ('TRUENO', 'es', 'naturaleza'), ('BOSQUE', 'es', 'naturaleza'),
  ('MONTAÑA', 'es', 'naturaleza'), ('RÍO', 'es', 'naturaleza'), ('DESIERTO', 'es', 'naturaleza'),
  ('NEVADA', 'es', 'naturaleza'), ('ARCOÍRIS', 'es', 'naturaleza'), ('VOLCÁN', 'es', 'naturaleza'),
  ('TORMENTA', 'es', 'naturaleza'), ('MAREA', 'es', 'naturaleza'), ('AMANECER', 'es', 'naturaleza'),
  ('BRISA', 'es', 'naturaleza'), ('ESCARCHA', 'es', 'naturaleza'), ('INCENDIO', 'es', 'naturaleza'),
  -- Emoción
  ('ESPERANZA', 'es', 'emoción'), ('MIEDO', 'es', 'emoción'), ('ALEGRÍA', 'es', 'emoción'),
  ('IRA', 'es', 'emoción'), ('AMOR', 'es', 'emoción'), ('DUELO', 'es', 'emoción'),
  ('ORGULLO', 'es', 'emoción'), ('VERGÜENZA', 'es', 'emoción'), ('ASOMBRO', 'es', 'emoción'),
  ('ENVIDIA', 'es', 'emoción'), ('CONFIANZA', 'es', 'emoción'), ('DUDA', 'es', 'emoción'),
  ('NOSTALGIA', 'es', 'emoción'), ('VALENTÍA', 'es', 'emoción'), ('SOLEDAD', 'es', 'emoción'),
  -- Vida
  ('SUEÑO', 'es', 'vida'), ('BODA', 'es', 'vida'), ('CUMPLEAÑOS', 'es', 'vida'),
  ('VACACIONES', 'es', 'vida'), ('MAÑANA', 'es', 'vida'), ('FIN DE SEMANA', 'es', 'vida'),
  ('FAMILIA', 'es', 'vida'), ('AMISTAD', 'es', 'vida'), ('ESCUELA', 'es', 'vida'),
  ('TRABAJO', 'es', 'vida'), ('DINERO', 'es', 'vida'), ('ÉXITO', 'es', 'vida'),
  ('FRACASO', 'es', 'vida'), ('CAMBIO', 'es', 'vida'), ('DORMIR', 'es', 'vida'),
  -- Comida
  ('CHOCOLATE', 'es', 'comida'), ('DESAYUNO', 'es', 'comida'), ('SUSHI', 'es', 'comida'),
  ('TACOS', 'es', 'comida'), ('HELADO', 'es', 'comida'), ('PASTA', 'es', 'comida'),
  ('QUESO', 'es', 'comida'), ('PAN', 'es', 'comida'), ('PASTEL', 'es', 'comida'),
  ('SOPA', 'es', 'comida'), ('VINO', 'es', 'comida'), ('ESPECIA', 'es', 'comida'),
  -- Abstracto
  ('TIEMPO', 'es', 'abstracto'), ('LIBERTAD', 'es', 'abstracto'), ('VERDAD', 'es', 'abstracto'),
  ('PODER', 'es', 'abstracto'), ('CAOS', 'es', 'abstracto'), ('PAZ', 'es', 'abstracto'),
  ('SUERTE', 'es', 'abstracto'), ('DESTINO', 'es', 'abstracto'), ('BELLEZA', 'es', 'abstracto'),
  ('RIESGO', 'es', 'abstracto'), ('SECRETO', 'es', 'abstracto'), ('PACIENCIA', 'es', 'abstracto'),
  -- Ciencia
  ('ESPACIO', 'es', 'ciencia'), ('LUZ', 'es', 'ciencia'), ('FUEGO', 'es', 'ciencia'),
  ('AGUA', 'es', 'ciencia'), ('TIERRA', 'es', 'ciencia'), ('ENERGÍA', 'es', 'ciencia')
ON CONFLICT (word, language) DO NOTHING;

-- Function to auto-assign words from pool to upcoming dates that have no word yet
-- Should be called by the daily cron or manually to keep the schedule filled
CREATE OR REPLACE FUNCTION assign_words_from_pool(p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE(assigned_date DATE, assigned_word TEXT, assigned_language TEXT) AS $$
DECLARE
  v_date DATE;
  v_lang TEXT;
  v_word_row RECORD;
BEGIN
  -- For each language, fill in any missing dates in the next p_days_ahead days
  FOR v_lang IN SELECT DISTINCT language FROM word_pool
  LOOP
    FOR v_date IN SELECT generate_series(CURRENT_DATE, CURRENT_DATE + p_days_ahead, '1 day'::interval)::date
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
        UPDATE word_pool SET used = FALSE WHERE language = v_lang;
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
      UPDATE word_pool SET used = TRUE WHERE id = v_word_row.id;

      assigned_date := v_date;
      assigned_word := v_word_row.word;
      assigned_language := v_lang;
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run it immediately to fill the next 30 days
SELECT * FROM assign_words_from_pool(30);

-- Schedule daily cron to keep the word schedule filled (runs at midnight UTC)
-- This ensures there are always words assigned 30 days out
SELECT cron.schedule(
  'assign-daily-words',
  '0 0 * * *',
  $$SELECT * FROM assign_words_from_pool(30);$$
);
