-- =============================================
-- Friends system: friendships table + functions
-- =============================================

-- Friend requests / friendships
CREATE TABLE friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can respond to requests" ON friendships
  FOR UPDATE USING (auth.uid() = addressee_id);

CREATE POLICY "Users can remove friendships" ON friendships
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Get accepted friends with profile info
CREATE OR REPLACE FUNCTION get_friends(p_user_id UUID)
RETURNS TABLE(
  friendship_id UUID,
  friend_id UUID,
  friend_username TEXT,
  friend_avatar_url TEXT,
  friend_current_streak INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END,
    p.username,
    p.avatar_url,
    p.current_streak,
    f.status
  FROM friendships f
  JOIN profiles p ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
  WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
  AND f.status = 'accepted'
  ORDER BY p.username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending requests received
CREATE OR REPLACE FUNCTION get_pending_requests(p_user_id UUID)
RETURNS TABLE(
  friendship_id UUID,
  requester_id UUID,
  requester_username TEXT,
  requester_avatar_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.requester_id, p.username, p.avatar_url, f.created_at
  FROM friendships f
  JOIN profiles p ON p.id = f.requester_id
  WHERE f.addressee_id = p_user_id AND f.status = 'pending'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get friends' descriptions for today's word (ONLY if user has played)
CREATE OR REPLACE FUNCTION get_friends_descriptions(p_user_id UUID, p_word_id UUID)
RETURNS TABLE(
  friend_id UUID,
  friend_username TEXT,
  friend_avatar_url TEXT,
  description_text TEXT,
  vote_count INTEGER,
  elo_rating DECIMAL,
  friend_streak INTEGER,
  has_played BOOLEAN
) AS $$
BEGIN
  -- Check if user has submitted their own description
  IF NOT EXISTS (
    SELECT 1 FROM descriptions WHERE user_id = p_user_id AND word_id = p_word_id
  ) THEN
    -- Return friends list but with has_played = false and no descriptions
    RETURN QUERY
    SELECT
      CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END,
      p.username,
      p.avatar_url,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::DECIMAL,
      p.current_streak,
      FALSE
    FROM friendships f
    JOIN profiles p ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
    WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
    AND f.status = 'accepted';
    RETURN;
  END IF;

  -- User has played, show friends' descriptions
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    d.description,
    d.vote_count,
    d.elo_rating,
    p.current_streak,
    TRUE
  FROM friendships f
  JOIN profiles p ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
  LEFT JOIN descriptions d ON d.user_id = p.id AND d.word_id = p_word_id
  WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
  AND f.status = 'accepted'
  ORDER BY d.elo_rating DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search users by username
CREATE OR REPLACE FUNCTION search_users(p_query TEXT, p_current_user UUID)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  current_streak INTEGER,
  is_friend BOOLEAN,
  request_pending BOOLEAN
) AS $$
BEGIN
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
  WHERE p.username ILIKE '%' || p_query || '%'
  AND p.id != p_current_user
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
