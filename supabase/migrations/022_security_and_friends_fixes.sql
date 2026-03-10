-- =============================================
-- Security & integrity fixes
-- =============================================

-- 1. SECURITY: update_streak must verify caller is the user
-- Previously any authenticated user could manipulate another's streak.
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_played DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE;
BEGIN
  -- Enforce that only the user (or seed system) can update their own streak
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot update another user''s streak';
  END IF;

  SELECT last_played_date, current_streak, longest_streak
  INTO v_last_played, v_current_streak, v_longest_streak
  FROM profiles
  WHERE id = p_user_id;

  v_today := game_date();

  IF v_last_played = v_today THEN
    RETURN;
  END IF;

  IF v_last_played = v_today - 1 THEN
    v_current_streak := v_current_streak + 1;
  ELSE
    v_current_streak := 1;
  END IF;

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

-- 2. SECURITY: submit_vote must verify caller is the voter
CREATE OR REPLACE FUNCTION submit_vote(
  p_voter_id UUID,
  p_word_id UUID,
  p_winner_id UUID,
  p_loser_id UUID
) RETURNS void AS $$
DECLARE
  v_winner_user_id UUID;
  v_winner_elo DECIMAL;
  v_loser_elo DECIMAL;
  v_expected_winner DECIMAL;
  v_expected_loser DECIMAL;
  v_k CONSTANT DECIMAL := 32.0;
BEGIN
  -- Enforce that the caller is the voter
  IF auth.uid() != p_voter_id THEN
    RAISE EXCEPTION 'Forbidden: cannot vote as another user';
  END IF;

  INSERT INTO votes (voter_id, word_id, winner_id, loser_id)
  VALUES (p_voter_id, p_word_id, p_winner_id, p_loser_id);

  SELECT elo_rating INTO v_winner_elo FROM descriptions WHERE id = p_winner_id;
  SELECT elo_rating INTO v_loser_elo FROM descriptions WHERE id = p_loser_id;

  v_expected_winner := 1.0 / (1.0 + POWER(10.0, (v_loser_elo - v_winner_elo) / 400.0));
  v_expected_loser := 1.0 / (1.0 + POWER(10.0, (v_winner_elo - v_loser_elo) / 400.0));

  UPDATE descriptions
  SET vote_count = vote_count + 1,
      elo_rating = elo_rating + v_k * (1.0 - v_expected_winner),
      matchup_count = matchup_count + 1
  WHERE id = p_winner_id;

  UPDATE descriptions
  SET elo_rating = elo_rating - v_k * v_expected_loser,
      matchup_count = matchup_count + 1
  WHERE id = p_loser_id;

  SELECT user_id INTO v_winner_user_id FROM descriptions WHERE id = p_winner_id;
  UPDATE profiles SET total_votes_received = total_votes_received + 1, updated_at = NOW()
  WHERE id = v_winner_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Prevent duplicate/reverse friend requests + self-friend
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS no_self_friend;
ALTER TABLE friendships ADD CONSTRAINT no_self_friend CHECK (requester_id != addressee_id);

-- Unique index on normalized pair to prevent A→B and B→A duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_friendship_pair
  ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

-- 4. Add indexes on friendships for query performance
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status);

-- 5. Update search_users to accept p_limit and p_offset parameters
-- (Client was sending these but the function didn't accept them, causing RPC failures)
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
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
