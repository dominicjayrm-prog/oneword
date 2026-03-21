-- =============================================
-- Reschedule all 15 launch words starting from March 21, 2026
-- Same words, same order, just shifted dates.
-- Also reset seed descriptions so they can be reused.
-- =============================================

-- 1. Delete any existing votes (only seed account test data)
DELETE FROM votes;

-- 2. Delete any existing descriptions (only seed account test data)
DELETE FROM descriptions;

-- 3. Delete all existing daily_words
DELETE FROM daily_words;

-- 4. Re-insert English words with new dates (Mar 21 – Apr 4, 2026)
INSERT INTO daily_words (word, date, category, language) VALUES
  ('RAIN',      '2026-03-21', 'nature',   'en'),
  ('MONDAY',    '2026-03-22', 'life',     'en'),
  ('SILENCE',   '2026-03-23', 'abstract', 'en'),
  ('PIZZA',     '2026-03-24', 'food',     'en'),
  ('JEALOUSY',  '2026-03-25', 'emotion',  'en'),
  ('KEYS',      '2026-03-26', 'objects',  'en'),
  ('CHILDHOOD', '2026-03-27', 'abstract', 'en'),
  ('WIFI',      '2026-03-28', 'modern',   'en'),
  ('GRAVITY',   '2026-03-29', 'science',  'en'),
  ('FRIDAY',    '2026-03-30', 'life',     'en'),
  ('OCEAN',     '2026-03-31', 'nature',   'en'),
  ('COFFEE',    '2026-04-01', 'food',     'en'),
  ('REGRET',    '2026-04-02', 'emotion',  'en'),
  ('MIRROR',    '2026-04-03', 'objects',  'en'),
  ('HOME',      '2026-04-04', 'abstract', 'en');

-- 5. Re-insert Spanish words with matching dates
INSERT INTO daily_words (word, date, category, language) VALUES
  ('LLUVIA',          '2026-03-21', 'naturaleza', 'es'),
  ('LUNES',           '2026-03-22', 'vida',       'es'),
  ('SILENCIO',        '2026-03-23', 'abstracto',  'es'),
  ('PIZZA',           '2026-03-24', 'comida',     'es'),
  ('CELOS',           '2026-03-25', 'emoción',    'es'),
  ('LLAVES',          '2026-03-26', 'objetos',    'es'),
  ('INFANCIA',        '2026-03-27', 'abstracto',  'es'),
  ('WIFI',            '2026-03-28', 'moderno',    'es'),
  ('GRAVEDAD',        '2026-03-29', 'ciencia',    'es'),
  ('VIERNES',         '2026-03-30', 'vida',       'es'),
  ('OCÉANO',          '2026-03-31', 'naturaleza', 'es'),
  ('CAFÉ',            '2026-04-01', 'comida',     'es'),
  ('ARREPENTIMIENTO', '2026-04-02', 'emoción',    'es'),
  ('ESPEJO',          '2026-04-03', 'objetos',    'es'),
  ('HOGAR',           '2026-04-04', 'abstracto',  'es');

-- 6. Reset all seed descriptions to unused so they can be submitted again
UPDATE seed_descriptions SET used = FALSE;
