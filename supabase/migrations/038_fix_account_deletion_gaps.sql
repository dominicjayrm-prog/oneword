-- =============================================
-- Fix account deletion to include tables added after the original function
-- Tables missing: favourites (031), moderation_log (030), ban_log (030)
-- =============================================

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete favourites (added in migration 031)
  DELETE FROM favourites WHERE user_id = v_user_id;

  -- Delete moderation logs (added in migration 030)
  DELETE FROM moderation_log WHERE user_id = v_user_id;

  -- Delete ban log entries (added in migration 030)
  DELETE FROM ban_log WHERE user_id = v_user_id;

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
