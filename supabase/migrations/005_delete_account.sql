-- Function to delete a user's own account and all associated data
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
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
