-- Daily words table
CREATE TABLE daily_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  date DATE NOT NULL UNIQUE,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 15 launch words with fixed dates (March 20 – April 3, 2026)
INSERT INTO daily_words (word, date, category) VALUES
  ('RAIN',      '2026-03-20', 'nature'),
  ('MONDAY',    '2026-03-21', 'life'),
  ('SILENCE',   '2026-03-22', 'abstract'),
  ('PIZZA',     '2026-03-23', 'food'),
  ('JEALOUSY',  '2026-03-24', 'emotion'),
  ('KEYS',      '2026-03-25', 'objects'),
  ('CHILDHOOD', '2026-03-26', 'abstract'),
  ('WIFI',      '2026-03-27', 'modern'),
  ('GRAVITY',   '2026-03-28', 'science'),
  ('FRIDAY',    '2026-03-29', 'life'),
  ('OCEAN',     '2026-03-30', 'nature'),
  ('COFFEE',    '2026-03-31', 'food'),
  ('REGRET',    '2026-04-01', 'emotion'),
  ('MIRROR',    '2026-04-02', 'objects'),
  ('HOME',      '2026-04-03', 'abstract');

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
