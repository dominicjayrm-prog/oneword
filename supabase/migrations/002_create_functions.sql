-- Function to get today's word
CREATE OR REPLACE FUNCTION get_today_word()
RETURNS TABLE(id UUID, word TEXT, category TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT dw.id, dw.word, dw.category
  FROM daily_words dw
  WHERE dw.date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a random pair of descriptions for voting
-- (excludes the voter's own description)
CREATE OR REPLACE FUNCTION get_vote_pair(p_word_id UUID, p_voter_id UUID)
RETURNS TABLE(
  desc1_id UUID, desc1_text TEXT, desc1_username TEXT,
  desc2_id UUID, desc2_text TEXT, desc2_username TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH eligible AS (
    SELECT d.id, d.description, p.username
    FROM descriptions d
    JOIN profiles p ON d.user_id = p.id
    WHERE d.word_id = p_word_id
    AND d.user_id != p_voter_id
    AND d.id NOT IN (
      SELECT v.winner_id FROM votes v WHERE v.voter_id = p_voter_id AND v.word_id = p_word_id
      UNION
      SELECT v.loser_id FROM votes v WHERE v.voter_id = p_voter_id AND v.word_id = p_word_id
    )
    ORDER BY RANDOM()
    LIMIT 2
  )
  SELECT
    (SELECT e.id FROM eligible e LIMIT 1),
    (SELECT e.description FROM eligible e LIMIT 1),
    (SELECT e.username FROM eligible e LIMIT 1),
    (SELECT e.id FROM eligible e OFFSET 1 LIMIT 1),
    (SELECT e.description FROM eligible e OFFSET 1 LIMIT 1),
    (SELECT e.username FROM eligible e OFFSET 1 LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit a vote and update vote counts
CREATE OR REPLACE FUNCTION submit_vote(
  p_voter_id UUID,
  p_word_id UUID,
  p_winner_id UUID,
  p_loser_id UUID
) RETURNS void AS $$
BEGIN
  INSERT INTO votes (voter_id, word_id, winner_id, loser_id)
  VALUES (p_voter_id, p_word_id, p_winner_id, p_loser_id);

  UPDATE descriptions SET vote_count = vote_count + 1
  WHERE id = p_winner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get leaderboard for a word
CREATE OR REPLACE FUNCTION get_leaderboard(p_word_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  description_id UUID,
  description_text TEXT,
  username TEXT,
  votes INTEGER,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.description,
    p.username,
    d.vote_count,
    ROW_NUMBER() OVER (ORDER BY d.vote_count DESC) as rank
  FROM descriptions d
  JOIN profiles p ON d.user_id = p.id
  WHERE d.word_id = p_word_id
  ORDER BY d.vote_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || LEFT(NEW.id::TEXT, 8)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
