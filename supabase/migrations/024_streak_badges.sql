-- Add badge fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_badge_emoji TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_badge_name TEXT;

-- Badge calculation function
CREATE OR REPLACE FUNCTION get_streak_badge(p_streak INTEGER)
RETURNS TABLE(emoji TEXT, name TEXT, color TEXT) AS $$
BEGIN
  IF p_streak >= 365 THEN RETURN QUERY SELECT '♾️'::TEXT, 'Eternal'::TEXT, '#FF6B4A'::TEXT;
  ELSIF p_streak >= 100 THEN RETURN QUERY SELECT '⭐'::TEXT, 'Legend'::TEXT, '#FFD700'::TEXT;
  ELSIF p_streak >= 50 THEN RETURN QUERY SELECT '💎'::TEXT, 'Diamond'::TEXT, '#88E5FF'::TEXT;
  ELSIF p_streak >= 30 THEN RETURN QUERY SELECT '👑'::TEXT, 'Crowned'::TEXT, '#FFD700'::TEXT;
  ELSIF p_streak >= 14 THEN RETURN QUERY SELECT '⚡'::TEXT, 'Unstoppable'::TEXT, '#4A9BFF'::TEXT;
  ELSIF p_streak >= 7 THEN RETURN QUERY SELECT '🔥'::TEXT, 'On Fire'::TEXT, '#FF6B4A'::TEXT;
  ELSIF p_streak >= 3 THEN RETURN QUERY SELECT '✨'::TEXT, 'Spark'::TEXT, '#FF8A6B'::TEXT;
  ELSE RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if a streak milestone was just reached
CREATE OR REPLACE FUNCTION check_streak_milestone(p_old_streak INTEGER, p_new_streak INTEGER)
RETURNS TABLE(hit_milestone BOOLEAN, milestone_streak INTEGER, milestone_emoji TEXT, milestone_name TEXT, milestone_tagline TEXT) AS $$
DECLARE
  milestones INTEGER[] := ARRAY[3, 7, 14, 30, 50, 100, 365];
  taglines TEXT[] := ARRAY[
    'The flame begins.',
    'A whole week. Unstoppable.',
    'Two weeks of pure creativity.',
    'A month. You earned the crown.',
    'Fifty days. Ice cold dedication.',
    'One hundred days. Legendary.',
    'A full year. You are OneWord.'
  ];
  m INTEGER;
  idx INTEGER := 1;
BEGIN
  FOREACH m IN ARRAY milestones LOOP
    IF p_old_streak < m AND p_new_streak >= m THEN
      RETURN QUERY SELECT true, m, (SELECT sb.emoji FROM get_streak_badge(m) sb), (SELECT sb.name FROM get_streak_badge(m) sb), taglines[idx];
      RETURN;
    END IF;
    idx := idx + 1;
  END LOOP;
  RETURN QUERY SELECT false, 0, NULL::TEXT, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the streak function to also set badge fields
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

-- Update existing leaderboard function to include badge emoji
CREATE OR REPLACE FUNCTION get_leaderboard(p_word_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  description_id UUID,
  description_text TEXT,
  username TEXT,
  votes BIGINT,
  rank BIGINT,
  streak_badge_emoji TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS description_id,
    d.description AS description_text,
    p.username,
    d.vote_count AS votes,
    ROW_NUMBER() OVER (ORDER BY d.vote_count DESC, d.created_at ASC) AS rank,
    p.streak_badge_emoji
  FROM descriptions d
  JOIN profiles p ON d.user_id = p.id
  WHERE d.word_id = p_word_id
  ORDER BY d.vote_count DESC, d.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update vote pair to include badge emoji
CREATE OR REPLACE FUNCTION get_vote_pair(p_word_id UUID, p_voter_id UUID)
RETURNS TABLE(
  desc1_id UUID, desc1_text TEXT, desc1_username TEXT, desc1_badge_emoji TEXT,
  desc2_id UUID, desc2_text TEXT, desc2_username TEXT, desc2_badge_emoji TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH eligible AS (
    SELECT d.id, d.description, p.username, p.streak_badge_emoji AS badge_emoji
    FROM descriptions d
    JOIN profiles p ON d.user_id = p.id
    WHERE d.word_id = p_word_id
    AND d.user_id != p_voter_id
    AND d.id NOT IN (
      SELECT r.description_id FROM reports r WHERE r.reporter_id = p_voter_id
    )
    AND d.id NOT IN (
      SELECT r.description_id FROM reports r
      GROUP BY r.description_id HAVING COUNT(*) >= 3
    )
  ),
  voted_pairs AS (
    SELECT v.winner_id, v.loser_id
    FROM votes v
    WHERE v.voter_id = p_voter_id AND v.word_id = p_word_id
  ),
  available_pairs AS (
    SELECT
      a.id AS a_id, a.description AS a_desc, a.username AS a_user, a.badge_emoji AS a_badge,
      b.id AS b_id, b.description AS b_desc, b.username AS b_user, b.badge_emoji AS b_badge
    FROM eligible a
    CROSS JOIN eligible b
    WHERE a.id < b.id
    AND NOT EXISTS (
      SELECT 1 FROM voted_pairs vp
      WHERE (vp.winner_id = a.id AND vp.loser_id = b.id)
         OR (vp.winner_id = b.id AND vp.loser_id = a.id)
    )
  )
  SELECT a_id, a_desc, a_user, a_badge, b_id, b_desc, b_user, b_badge
  FROM available_pairs
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_friends to include badge emoji
CREATE OR REPLACE FUNCTION get_friends(p_user_id UUID)
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
  AND f.status = 'accepted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing profiles with badges based on current streak
UPDATE profiles
SET
  streak_badge_emoji = (SELECT sb.emoji FROM get_streak_badge(current_streak) sb),
  streak_badge_name = (SELECT sb.name FROM get_streak_badge(current_streak) sb)
WHERE current_streak >= 3;
