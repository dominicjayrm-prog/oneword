-- Move dismissal state and vote progress from AsyncStorage to server-side
-- so they persist across devices.

-- Table to track per-user dismissed interstitials
CREATE TABLE user_dismissals (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  winner_dismissed_date TEXT,        -- game date string, e.g. "2026-03-10"
  recap_dismissed_week TEXT,         -- Monday date string, e.g. "2026-03-09"
  milestones_shown INTEGER[] DEFAULT '{}', -- streak numbers already celebrated
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own dismissals"
  ON user_dismissals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dismissals"
  ON user_dismissals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dismissals"
  ON user_dismissals FOR UPDATE USING (auth.uid() = user_id);

-- Upsert a dismissal field for the current user.
-- p_field: 'winner_dismissed_date' | 'recap_dismissed_week'
-- p_value: the date/week string to store
CREATE OR REPLACE FUNCTION set_dismissal(p_user_id UUID, p_field TEXT, p_value TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_dismissals (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF p_field = 'winner_dismissed_date' THEN
    UPDATE user_dismissals SET winner_dismissed_date = p_value, updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSIF p_field = 'recap_dismissed_week' THEN
    UPDATE user_dismissals SET recap_dismissed_week = p_value, updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a milestone streak to the shown list (idempotent).
CREATE OR REPLACE FUNCTION add_milestone_shown(p_user_id UUID, p_streak INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_dismissals (user_id, milestones_shown)
  VALUES (p_user_id, ARRAY[p_streak])
  ON CONFLICT (user_id)
  DO UPDATE SET
    milestones_shown = CASE
      WHEN p_streak = ANY(user_dismissals.milestones_shown) THEN user_dismissals.milestones_shown
      ELSE array_append(user_dismissals.milestones_shown, p_streak)
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get dismissal state for a user.
CREATE OR REPLACE FUNCTION get_dismissals(p_user_id UUID)
RETURNS TABLE(
  winner_dismissed_date TEXT,
  recap_dismissed_week TEXT,
  milestones_shown INTEGER[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT ud.winner_dismissed_date, ud.recap_dismissed_week, ud.milestones_shown
  FROM user_dismissals ud
  WHERE ud.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Count how many votes a user has cast for a specific word today.
-- Used to restore vote progress across devices.
CREATE OR REPLACE FUNCTION get_user_vote_count(p_user_id UUID, p_word_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM votes WHERE voter_id = p_user_id AND word_id = p_word_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
