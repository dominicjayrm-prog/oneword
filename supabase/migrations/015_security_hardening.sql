-- =============================================
-- Security hardening: rate limiting, delete account cleanup
-- =============================================

-- =============================================
-- 1. Fix delete_own_account to also remove friendships and reports
-- =============================================
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete friendships (both directions)
  DELETE FROM friendships
  WHERE requester_id = v_user_id OR addressee_id = v_user_id;

  -- Delete reports filed by this user
  DELETE FROM reports WHERE reporter_id = v_user_id;

  -- Delete descriptions (cascades votes via FK)
  DELETE FROM descriptions WHERE user_id = v_user_id;

  -- Delete votes cast by the user
  DELETE FROM votes WHERE voter_id = v_user_id;

  -- Delete profile
  DELETE FROM profiles WHERE id = v_user_id;

  -- Delete the auth user (requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. DB-level rate limiting for friend requests
-- Prevent a user from sending more than 20 friend requests per day
-- =============================================
CREATE OR REPLACE FUNCTION check_friend_request_rate()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM friendships
  WHERE requester_id = NEW.requester_id
    AND created_at > NOW() - INTERVAL '24 hours';

  IF v_count >= 20 THEN
    RAISE EXCEPTION 'Too many friend requests. Please try again later.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_friend_request_rate ON friendships;
CREATE TRIGGER trg_friend_request_rate
  BEFORE INSERT ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION check_friend_request_rate();

-- =============================================
-- 3. DB-level rate limiting for reports
-- Prevent a user from filing more than 10 reports per day
-- =============================================
CREATE OR REPLACE FUNCTION check_report_rate()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM reports
  WHERE reporter_id = NEW.reporter_id
    AND created_at > NOW() - INTERVAL '24 hours';

  IF v_count >= 10 THEN
    RAISE EXCEPTION 'Too many reports. Please try again later.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_report_rate ON reports;
CREATE TRIGGER trg_report_rate
  BEFORE INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION check_report_rate();

-- =============================================
-- 4. DB-level vote rate limiting
-- The existing unique index prevents duplicate pairs, but also limit
-- total votes per user per word to 15 (matches client MAX_VOTES)
-- =============================================
CREATE OR REPLACE FUNCTION check_vote_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM votes
  WHERE voter_id = NEW.voter_id
    AND word_id = NEW.word_id;

  IF v_count >= 15 THEN
    RAISE EXCEPTION 'Vote limit reached for today.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vote_limit ON votes;
CREATE TRIGGER trg_vote_limit
  BEFORE INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION check_vote_limit();

-- =============================================
-- 5. Prevent self-friending
-- =============================================
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS no_self_friend;
ALTER TABLE friendships ADD CONSTRAINT no_self_friend
  CHECK (requester_id != addressee_id);
