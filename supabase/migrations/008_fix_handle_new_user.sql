-- =============================================
-- Fix handle_new_user trigger to be more robust
-- Prevents "Database error saving new user" on signup
-- =============================================

-- Recreate handle_new_user with proper error handling
-- Uses an exception block so the trigger never crashes auth.users INSERT
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || LEFT(NEW.id::TEXT, 8)),
    COALESCE(NEW.raw_user_meta_data->>'language', 'en')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Username already taken: generate a unique fallback username
    INSERT INTO profiles (id, username, language)
    VALUES (
      NEW.id,
      'player_' || LEFT(NEW.id::TEXT, 12),
      COALESCE(NEW.raw_user_meta_data->>'language', 'en')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log but don't crash signup - profile can be created later
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
