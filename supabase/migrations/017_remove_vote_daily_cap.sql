-- Replace hard 15-vote-per-day cap with a rate limiter.
-- The old check_vote_limit() blocked any vote after 15 per word per user.
-- The new check_vote_rate() prevents spam (max 30 votes in any 30-second window)
-- but allows unlimited total votes as long as there are unseen pairs.
-- The unique pair index (idx_votes_unique_pair) already prevents duplicate pair voting.

CREATE OR REPLACE FUNCTION check_vote_rate()
RETURNS TRIGGER AS $$
DECLARE
  v_recent INTEGER;
BEGIN
  -- Count votes in the last 30 seconds for this user (any word)
  SELECT COUNT(*) INTO v_recent
  FROM votes
  WHERE voter_id = NEW.voter_id
    AND created_at > NOW() - INTERVAL '30 seconds';

  IF v_recent >= 30 THEN
    RAISE EXCEPTION 'Voting too fast. Please slow down.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the old trigger with the new rate-based one
DROP TRIGGER IF EXISTS trg_vote_limit ON votes;
DROP FUNCTION IF EXISTS check_vote_limit();

CREATE TRIGGER trg_vote_rate
  BEFORE INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION check_vote_rate();

-- Add index to support the rate check query efficiently
CREATE INDEX IF NOT EXISTS idx_votes_voter_created
  ON votes(voter_id, created_at DESC);
