-- =============================================
-- Fix security regressions from migration 028
-- =============================================

-- #1: Restore auth.uid() check to update_streak.
-- Migration 028 recreated this function but dropped the auth guard
-- that migration 022 added. Without it, any authenticated user can
-- manipulate another user's streak by calling update_streak(other_id).
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_played DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_total_plays INTEGER;
  v_badge_emoji TEXT;
  v_badge_name TEXT;
BEGIN
  -- Enforce that only the user (or seed system) can update their own streak
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot update another user''s streak';
  END IF;

  SELECT last_played_date, current_streak, longest_streak, total_plays
  INTO v_last_played, v_current_streak, v_longest_streak, v_total_plays
  FROM profiles WHERE id = p_user_id;

  IF v_last_played = game_date() THEN
    RETURN;
  END IF;

  IF v_last_played = game_date() - 1 THEN
    v_current_streak := v_current_streak + 1;
  ELSE
    v_current_streak := 1;
  END IF;

  SELECT sb.emoji, sb.name INTO v_badge_emoji, v_badge_name
  FROM get_streak_badge(v_current_streak) sb;

  UPDATE profiles SET
    current_streak = v_current_streak,
    longest_streak = GREATEST(v_longest_streak, v_current_streak),
    total_plays = v_total_plays + 1,
    last_played_date = game_date(),
    streak_badge_emoji = v_badge_emoji,
    streak_badge_name = v_badge_name,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- #2: Add auth.uid() check to submit_report.
-- The function is SECURITY DEFINER (bypasses RLS) but never verified
-- that the caller is the reporter. A malicious user could file reports
-- as any other user, potentially getting descriptions auto-moderated.
CREATE OR REPLACE FUNCTION submit_report(
  p_reporter_id UUID,
  p_description_id UUID,
  p_word_id UUID,
  p_reason TEXT DEFAULT 'inappropriate'
) RETURNS void AS $$
BEGIN
  -- Enforce that the caller is the reporter
  IF auth.uid() != p_reporter_id THEN
    RAISE EXCEPTION 'Forbidden: cannot report as another user';
  END IF;

  INSERT INTO reports (reporter_id, description_id, word_id, reason)
  VALUES (p_reporter_id, p_description_id, p_word_id, p_reason)
  ON CONFLICT (reporter_id, description_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
