-- =============================================
-- Remaining audit fixes: game_date regression, search auth,
-- leaderboard auth, friendship ownership
-- =============================================

-- =============================================
-- 1. FIX REGRESSION: get_yesterday_winner uses CURRENT_DATE instead of game_date()
-- Migration 036 accidentally reverted to CURRENT_DATE - 1, which breaks
-- the 5am UTC rollover. Between midnight and 5am UTC, no winner is shown.
-- =============================================
CREATE OR REPLACE FUNCTION get_yesterday_winner(p_user_id UUID, p_language TEXT)
RETURNS TABLE(
  word TEXT,
  word_category TEXT,
  winner_description TEXT,
  winner_username TEXT,
  winner_votes INTEGER,
  user_description TEXT,
  user_rank BIGINT,
  total_descriptions BIGINT,
  user_was_winner BOOLEAN
) AS $$
DECLARE
  yesterday_word_id UUID;
  yesterday_word TEXT;
  yesterday_category TEXT;
BEGIN
  -- Enforce that the caller is the user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot read another user''s yesterday results';
  END IF;

  -- Use game_date() for 5am UTC rollover consistency
  SELECT dw.id, dw.word, dw.category
  INTO yesterday_word_id, yesterday_word, yesterday_category
  FROM daily_words dw
  WHERE dw.date = game_date() - 1
    AND dw.language = p_language;

  IF yesterday_word_id IS NULL THEN
    RETURN; -- No word yesterday
  END IF;

  RETURN QUERY
  WITH all_ranked AS (
    SELECT
      d.description,
      p.username,
      d.vote_count,
      d.user_id,
      p.is_shadowbanned,
      ROW_NUMBER() OVER (ORDER BY d.vote_count DESC, d.created_at ASC) as rnk,
      COUNT(*) OVER () as total
    FROM descriptions d
    JOIN profiles p ON d.user_id = p.id
    WHERE d.word_id = yesterday_word_id
  ),
  winner AS (
    SELECT * FROM all_ranked WHERE rnk = 1 AND is_shadowbanned = false
  ),
  user_entry AS (
    SELECT * FROM all_ranked WHERE user_id = p_user_id
  )
  SELECT
    yesterday_word,
    yesterday_category,
    w.description,
    w.username,
    w.vote_count,
    ue.description,
    ue.rnk,
    COALESCE(w.total, ue.total),
    COALESCE(w.user_id = p_user_id, FALSE)
  FROM user_entry ue
  FULL OUTER JOIN winner w ON TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. FIX: search_users missing auth.uid() check + shadowban filter
-- The SECURITY DEFINER function accepts p_current_user without
-- verifying auth.uid(), letting anyone see another user's friendship
-- status. Also, shadowbanned users appear in search results.
-- =============================================
CREATE OR REPLACE FUNCTION search_users(p_query TEXT, p_current_user UUID, p_limit INTEGER DEFAULT 10, p_offset INTEGER DEFAULT 0)
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
  -- Enforce that the caller is the searching user
  IF auth.uid() != p_current_user THEN
    RAISE EXCEPTION 'Forbidden: cannot search as another user';
  END IF;

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
  AND p.is_shadowbanned = FALSE
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. FIX: get_leaderboard writes best_rank without auth check
-- The function updates profiles.best_rank for ALL users as a side
-- effect of a read query. Any caller (even unauthenticated) can
-- trigger this write. Add auth requirement for the write path.
-- =============================================
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
DECLARE
  v_requesting_user_id UUID;
BEGIN
  v_requesting_user_id := auth.uid();

  -- Only update best_rank if the caller is authenticated
  IF v_requesting_user_id IS NOT NULL THEN
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
  END IF;

  -- Return leaderboard excluding shadowbanned users
  -- (but always include the requesting user's own entry)
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
  AND (p.is_shadowbanned = false OR d.user_id = v_requesting_user_id)
  ORDER BY d.vote_count DESC, d.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
