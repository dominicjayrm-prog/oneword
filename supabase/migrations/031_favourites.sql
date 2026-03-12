-- =============================================
-- Favourites System
-- Users can save descriptions they love
-- =============================================

-- Favourites table
CREATE TABLE IF NOT EXISTS favourites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  description_id UUID REFERENCES descriptions(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, description_id)
);

ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own favourites" ON favourites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favourites" ON favourites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favourites" ON favourites
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_favourites_user_id ON favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_favourites_user_desc ON favourites(user_id, description_id);

-- Get user's favourite phrases with full details
CREATE OR REPLACE FUNCTION get_favourites(p_user_id UUID)
RETURNS TABLE (
  favourite_id UUID,
  description_id UUID,
  description_text TEXT,
  word TEXT,
  word_date DATE,
  author_username TEXT,
  author_id UUID,
  vote_count INTEGER,
  rank INTEGER,
  is_own BOOLEAN,
  saved_at TIMESTAMPTZ
) AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot read another user''s favourites';
  END IF;

  RETURN QUERY
  SELECT
    f.id AS favourite_id,
    d.id AS description_id,
    d.description AS description_text,
    dw.word,
    dw.date AS word_date,
    p.username AS author_username,
    d.user_id AS author_id,
    d.vote_count,
    d.rank,
    (d.user_id = p_user_id) AS is_own,
    f.created_at AS saved_at
  FROM favourites f
  JOIN descriptions d ON f.description_id = d.id
  JOIN daily_words dw ON d.word_id = dw.id
  JOIN profiles p ON d.user_id = p.id
  WHERE f.user_id = p_user_id
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle favourite (add if not exists, remove if exists)
CREATE OR REPLACE FUNCTION toggle_favourite(p_user_id UUID, p_description_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  existing UUID;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot toggle favourites for another user';
  END IF;

  SELECT id INTO existing FROM favourites
  WHERE user_id = p_user_id AND description_id = p_description_id;

  IF existing IS NOT NULL THEN
    DELETE FROM favourites WHERE id = existing;
    RETURN false; -- unfavourited
  ELSE
    INSERT INTO favourites (user_id, description_id) VALUES (p_user_id, p_description_id);
    RETURN true; -- favourited
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Batch check which descriptions are favourited by the user
CREATE OR REPLACE FUNCTION get_favourited_ids(p_user_id UUID, p_description_ids UUID[])
RETURNS TABLE (description_id UUID) AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT f.description_id
  FROM favourites f
  WHERE f.user_id = p_user_id
  AND f.description_id = ANY(p_description_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Update get_friends_descriptions to return description_id
-- so hearts can be shown on friends' descriptions
-- =============================================
DROP FUNCTION IF EXISTS get_friends_descriptions(UUID, UUID);

CREATE FUNCTION get_friends_descriptions(p_user_id UUID, p_word_id UUID)
RETURNS TABLE(
  friend_id UUID,
  friend_username TEXT,
  friend_avatar_url TEXT,
  description_text TEXT,
  vote_count INTEGER,
  elo_rating DECIMAL,
  friend_streak INTEGER,
  has_played BOOLEAN,
  description_id UUID
) AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot read another user''s friends descriptions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM descriptions WHERE user_id = p_user_id AND word_id = p_word_id
  ) THEN
    RETURN QUERY
    SELECT
      CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END,
      p.username,
      p.avatar_url,
      NULL::TEXT,
      NULL::INTEGER,
      NULL::DECIMAL,
      p.current_streak,
      FALSE,
      NULL::UUID
    FROM friendships f
    JOIN profiles p ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
    WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
    AND f.status = 'accepted'
    AND p.is_shadowbanned = false;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    d.description,
    d.vote_count,
    d.elo_rating,
    p.current_streak,
    TRUE,
    d.id
  FROM friendships f
  JOIN profiles p ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
  LEFT JOIN descriptions d ON d.user_id = p.id AND d.word_id = p_word_id
  WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
  AND f.status = 'accepted'
  AND p.is_shadowbanned = false
  ORDER BY d.elo_rating DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
