-- Function to update user streak after submitting a description
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_played DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  SELECT last_played_date, current_streak, longest_streak
  INTO v_last_played, v_current_streak, v_longest_streak
  FROM profiles
  WHERE id = p_user_id;

  -- Already played today, no update needed
  IF v_last_played = CURRENT_DATE THEN
    RETURN;
  END IF;

  IF v_last_played = CURRENT_DATE - 1 THEN
    -- Played yesterday: extend streak
    v_current_streak := v_current_streak + 1;
  ELSE
    -- Missed a day (or first time): reset streak to 1
    v_current_streak := 1;
  END IF;

  -- Update longest streak if current exceeds it
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  UPDATE profiles
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      total_plays = total_plays + 1,
      last_played_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update submit_vote to also increment total_votes_received on the winner's profile
CREATE OR REPLACE FUNCTION submit_vote(
  p_voter_id UUID,
  p_word_id UUID,
  p_winner_id UUID,
  p_loser_id UUID
) RETURNS void AS $$
DECLARE
  v_winner_user_id UUID;
BEGIN
  INSERT INTO votes (voter_id, word_id, winner_id, loser_id)
  VALUES (p_voter_id, p_word_id, p_winner_id, p_loser_id);

  -- Increment vote count on the winning description
  UPDATE descriptions SET vote_count = vote_count + 1
  WHERE id = p_winner_id;

  -- Increment total_votes_received on the winning user's profile
  SELECT user_id INTO v_winner_user_id FROM descriptions WHERE id = p_winner_id;
  UPDATE profiles SET total_votes_received = total_votes_received + 1, updated_at = NOW()
  WHERE id = v_winner_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update leaderboard to also set best_rank on profiles
CREATE OR REPLACE FUNCTION get_leaderboard(p_word_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  description_id UUID,
  description_text TEXT,
  username TEXT,
  votes INTEGER,
  rank BIGINT
) AS $$
BEGIN
  -- Update best_rank for all users who submitted for this word
  WITH ranked AS (
    SELECT d.user_id, ROW_NUMBER() OVER (ORDER BY d.vote_count DESC) as r
    FROM descriptions d
    WHERE d.word_id = p_word_id
  )
  UPDATE profiles p
  SET best_rank = LEAST(COALESCE(p.best_rank, ranked.r::INTEGER), ranked.r::INTEGER),
      updated_at = NOW()
  FROM ranked
  WHERE p.id = ranked.user_id;

  -- Return the leaderboard
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
