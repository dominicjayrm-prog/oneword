-- Daily words table
CREATE TABLE daily_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  date DATE NOT NULL UNIQUE,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed some words for testing
INSERT INTO daily_words (word, date, category) VALUES
  ('RAIN', CURRENT_DATE, 'nature'),
  ('MONDAY', CURRENT_DATE + 1, 'life'),
  ('SILENCE', CURRENT_DATE + 2, 'abstract'),
  ('PIZZA', CURRENT_DATE + 3, 'food'),
  ('JEALOUSY', CURRENT_DATE + 4, 'emotion'),
  ('KEYS', CURRENT_DATE + 5, 'objects'),
  ('CHILDHOOD', CURRENT_DATE + 6, 'abstract'),
  ('WIFI', CURRENT_DATE + 7, 'modern'),
  ('GRAVITY', CURRENT_DATE + 8, 'science'),
  ('FRIDAY', CURRENT_DATE + 9, 'life'),
  ('OCEAN', CURRENT_DATE + 10, 'nature'),
  ('COFFEE', CURRENT_DATE + 11, 'food'),
  ('REGRET', CURRENT_DATE + 12, 'emotion'),
  ('MIRROR', CURRENT_DATE + 13, 'objects'),
  ('HOME', CURRENT_DATE + 14, 'abstract');

-- User profiles (extends Supabase auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_plays INTEGER DEFAULT 0,
  total_votes_received INTEGER DEFAULT 0,
  best_rank INTEGER,
  last_played_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Descriptions submitted by users
CREATE TABLE descriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  word_id UUID REFERENCES daily_words(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, word_id) -- one description per user per word
);

-- Votes (which description won in each pair)
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  word_id UUID REFERENCES daily_words(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES descriptions(id) ON DELETE CASCADE,
  loser_id UUID REFERENCES descriptions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE daily_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read daily words" ON daily_words FOR SELECT USING (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE descriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read descriptions" ON descriptions FOR SELECT USING (true);
CREATE POLICY "Users can insert own descriptions" ON descriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own votes" ON votes FOR SELECT USING (auth.uid() = voter_id);
CREATE POLICY "Users can insert own votes" ON votes FOR INSERT WITH CHECK (auth.uid() = voter_id);
