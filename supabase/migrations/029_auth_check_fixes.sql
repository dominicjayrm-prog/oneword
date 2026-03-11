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

-- #3: Restore best_rank update to get_leaderboard.
-- Migration 028 recreated get_leaderboard as a pure read query, dropping
-- the best_rank side effect that existed since migration 013. Without it,
-- profiles.best_rank is never updated and profile stats are stale.
DROP FUNCTION IF EXISTS get_leaderboard(UUID, INTEGER);

CREATE FUNCTION get_leaderboard(p_word_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  description_id UUID,
  description_text TEXT,
  username TEXT,
  votes BIGINT,
  rank BIGINT,
  streak_badge_emoji TEXT
) AS $$
BEGIN
  -- Update best_rank for all users who submitted for this word
  WITH ranked AS (
    SELECT d.user_id, ROW_NUMBER() OVER (ORDER BY d.vote_count DESC, d.created_at ASC) AS r
    FROM descriptions d
    WHERE d.word_id = p_word_id
  )
  UPDATE profiles p
  SET best_rank = LEAST(COALESCE(p.best_rank, ranked.r::INTEGER), ranked.r::INTEGER),
      updated_at = NOW()
  FROM ranked
  WHERE p.id = ranked.user_id;

  -- Return the leaderboard
  RETURN QUERY
  SELECT
    d.id AS description_id,
    d.description AS description_text,
    p.username,
    d.vote_count::BIGINT AS votes,
    ROW_NUMBER() OVER (ORDER BY d.vote_count DESC, d.created_at ASC) AS rank,
    p.streak_badge_emoji
  FROM descriptions d
  JOIN profiles p ON d.user_id = p.id
  WHERE d.word_id = p_word_id
  ORDER BY d.vote_count DESC, d.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- #4: Add auth.uid() checks to dismissal and vote-count functions.
-- All are SECURITY DEFINER (bypass RLS) but accepted arbitrary p_user_id
-- without verification. Any authenticated user could read/modify another
-- user's dismissal state or query their vote count.

CREATE OR REPLACE FUNCTION set_dismissal(p_user_id UUID, p_field TEXT, p_value TEXT)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot modify another user''s dismissals';
  END IF;

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

CREATE OR REPLACE FUNCTION add_milestone_shown(p_user_id UUID, p_streak INTEGER)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot modify another user''s milestones';
  END IF;

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

CREATE OR REPLACE FUNCTION get_dismissals(p_user_id UUID)
RETURNS TABLE(
  winner_dismissed_date TEXT,
  recap_dismissed_week TEXT,
  milestones_shown INTEGER[]
) AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot read another user''s dismissals';
  END IF;

  RETURN QUERY
  SELECT ud.winner_dismissed_date, ud.recap_dismissed_week, ud.milestones_shown
  FROM user_dismissals ud
  WHERE ud.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_vote_count(p_user_id UUID, p_word_id UUID)
RETURNS INTEGER AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot read another user''s vote count';
  END IF;

  RETURN (SELECT COUNT(*)::INTEGER FROM votes WHERE voter_id = p_user_id AND word_id = p_word_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- #5: Add auth.uid() checks to friend-related SECURITY DEFINER functions.
-- Any authenticated user could enumerate another user's friends, pending
-- requests, and friends' descriptions by passing an arbitrary user ID.

DROP FUNCTION IF EXISTS get_friends(UUID);

CREATE FUNCTION get_friends(p_user_id UUID)
RETURNS TABLE(
  friendship_id UUID,
  friend_id UUID,
  friend_username TEXT,
  friend_avatar_url TEXT,
  friend_current_streak INTEGER,
  friend_badge_emoji TEXT,
  status TEXT
) AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot read another user''s friends';
  END IF;

  RETURN QUERY
  SELECT
    f.id AS friendship_id,
    CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END AS friend_id,
    p.username AS friend_username,
    p.avatar_url AS friend_avatar_url,
    p.current_streak AS friend_current_streak,
    p.streak_badge_emoji AS friend_badge_emoji,
    f.status
  FROM friendships f
  JOIN profiles p ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
  WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
  AND f.status = 'accepted'
  ORDER BY p.username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_pending_requests(p_user_id UUID)
RETURNS TABLE(
  friendship_id UUID,
  requester_id UUID,
  requester_username TEXT,
  requester_avatar_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot read another user''s friend requests';
  END IF;

  RETURN QUERY
  SELECT f.id, f.requester_id, p.username, p.avatar_url, f.created_at
  FROM friendships f
  JOIN profiles p ON p.id = f.requester_id
  WHERE f.addressee_id = p_user_id AND f.status = 'pending'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_friends_descriptions(p_user_id UUID, p_word_id UUID)
RETURNS TABLE(
  friend_id UUID,
  friend_username TEXT,
  friend_avatar_url TEXT,
  description_text TEXT,
  vote_count INTEGER,
  elo_rating DECIMAL,
  friend_streak INTEGER,
  has_played BOOLEAN
) AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot read another user''s friends descriptions';
  END IF;

  -- Check if user has submitted their own description
  IF NOT EXISTS (
    SELECT 1 FROM descriptions WHERE user_id = p_user_id AND word_id = p_word_id
  ) THEN
    RETURN QUERY
    SELECT
      CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END,
      p.username,
      p.avatar_url,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::DECIMAL,
      p.current_streak,
      FALSE
    FROM friendships f
    JOIN profiles p ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
    WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
    AND f.status = 'accepted';
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    d.description,
    d.vote_count,
    d.elo_rating,
    p.current_streak,
    TRUE
  FROM friendships f
  JOIN profiles p ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
  LEFT JOIN descriptions d ON d.user_id = p.id AND d.word_id = p_word_id
  WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
  AND f.status = 'accepted'
  ORDER BY d.elo_rating DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
