-- Server-side username profanity check.
-- Safety net for direct API access that bypasses client-side validation.
-- The client-side blocklist is more comprehensive; this catches the worst offenders.

CREATE OR REPLACE FUNCTION check_username_profanity()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip check if username hasn't changed (for updates that don't touch username)
  IF TG_OP = 'UPDATE' AND NEW.username = OLD.username THEN
    RETURN NEW;
  END IF;

  -- Check against blocked patterns (English and Spanish profanity/slurs)
  IF lower(NEW.username) ~* '(fuck|shit|bitch|cunt|nigger|nigga|faggot|fag|dick|cock|pussy|whore|slut|rape|pedo|porn|nazi|hitler|retard|asshole|wank|twat|tranny|dyke|spic|chink|kike|gook|wetback|beaner|coon|puta|puto|mierda|cono|verga|pendej|cabron|maricon|marica|zorra|perra|chingar|pinche|hijueputa|follar|polla|sudaca|negrata)' THEN
    RAISE EXCEPTION 'Username not available' USING ERRCODE = 'P0001';
  END IF;

  -- Check reserved usernames (exact match)
  IF lower(NEW.username) IN (
    'admin', 'administrator', 'oneword', 'playoneword', 'moderator',
    'mod', 'support', 'help', 'official', 'staff', 'system',
    'root', 'bot', 'null', 'undefined', 'test', 'delete'
  ) THEN
    RAISE EXCEPTION 'Username not available' USING ERRCODE = 'P0001';
  END IF;

  -- Enforce format rules: must start with a letter, alphanumeric + underscore only
  IF NEW.username !~ '^[a-zA-Z][a-zA-Z0-9_]*$' THEN
    RAISE EXCEPTION 'Username must start with a letter and contain only letters, numbers, and underscores' USING ERRCODE = 'P0001';
  END IF;

  -- No consecutive underscores
  IF NEW.username ~ '__' THEN
    RAISE EXCEPTION 'Username cannot contain consecutive underscores' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS username_profanity_check ON profiles;

-- Create trigger for both INSERT and UPDATE of username
CREATE TRIGGER username_profanity_check
  BEFORE INSERT OR UPDATE OF username ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_username_profanity();
