-- Reports table for flagged descriptions
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  description_id UUID REFERENCES descriptions(id) ON DELETE CASCADE,
  word_id UUID REFERENCES daily_words(id) ON DELETE CASCADE,
  reason TEXT DEFAULT 'inappropriate',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'removed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reporter_id, description_id) -- one report per user per description
);

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can read own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);

-- Function to submit a report
CREATE OR REPLACE FUNCTION submit_report(
  p_reporter_id UUID,
  p_description_id UUID,
  p_word_id UUID,
  p_reason TEXT DEFAULT 'inappropriate'
) RETURNS void AS $$
BEGIN
  INSERT INTO reports (reporter_id, description_id, word_id, reason)
  VALUES (p_reporter_id, p_description_id, p_word_id, p_reason)
  ON CONFLICT (reporter_id, description_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-hide descriptions with 3+ reports (optional auto-moderation)
CREATE OR REPLACE FUNCTION check_auto_moderate()
RETURNS TRIGGER AS $$
DECLARE
  report_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM reports
  WHERE description_id = NEW.description_id AND status = 'pending';

  -- If 3 or more unique reports, mark description for review
  IF report_count >= 3 THEN
    UPDATE reports SET status = 'reviewed'
    WHERE description_id = NEW.description_id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_new_report
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION check_auto_moderate();
