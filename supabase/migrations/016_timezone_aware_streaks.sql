-- Add timezone column to profiles for timezone-aware streak calculation.
-- Uses IANA timezone identifiers (e.g. 'America/Los_Angeles', 'Europe/London').
-- Defaults to 'UTC' for existing users until the client syncs their timezone.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Recreate update_streak to compare dates in the user's local timezone.
-- Previously used CURRENT_DATE (UTC), which caused users in negative UTC offsets
-- to lose streaks prematurely (e.g. UTC-8 users lost their streak at 4pm local time).
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_played DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_timezone TEXT;
  v_today DATE;
BEGIN
  SELECT last_played_date, current_streak, longest_streak, COALESCE(timezone, 'UTC')
  INTO v_last_played, v_current_streak, v_longest_streak, v_timezone
  FROM profiles
  WHERE id = p_user_id;

  -- Calculate "today" in the user's local timezone
  v_today := (NOW() AT TIME ZONE v_timezone)::date;

  -- Already played today (in their timezone), no update needed
  IF v_last_played = v_today THEN
    RETURN;
  END IF;

  IF v_last_played = v_today - 1 THEN
    -- Played yesterday (in their timezone): extend streak
    v_current_streak := v_current_streak + 1;
  ELSE
    -- Missed a day (or first time): reset streak to 1
    v_current_streak := 1;
  END IF;

  -- Update longest streak if current exceeds it
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  UPDATE profiles
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      total_plays = total_plays + 1,
      last_played_date = v_today,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
