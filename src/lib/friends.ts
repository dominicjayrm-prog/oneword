import { supabase } from './supabase';

export interface Friend {
  friendship_id: string;
  friend_id: string;
  friend_username: string;
  friend_avatar_url: string | null;
  friend_current_streak: number;
  status: string;
}

export interface PendingRequest {
  friendship_id: string;
  requester_id: string;
  requester_username: string;
  requester_avatar_url: string | null;
  created_at: string;
}

export interface FriendDescription {
  friend_id: string;
  friend_username: string;
  friend_avatar_url: string | null;
  description_text: string | null;
  vote_count: number | null;
  elo_rating: number | null;
  friend_streak: number;
  has_played: boolean;
}

export interface UserSearchResult {
  user_id: string;
  username: string;
  avatar_url: string | null;
  current_streak: number;
  is_friend: boolean;
  request_pending: boolean;
}

export async function getFriends(userId: string): Promise<Friend[]> {
  const { data, error } = await supabase.rpc('get_friends', { p_user_id: userId });
  if (!error) return data ?? [];

  // Fallback: direct query if RPC doesn't exist yet
  const { data: rows, error: fbError } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (fbError || !rows) return [];

  const friendIds = rows.map((r) => r.requester_id === userId ? r.addressee_id : r.requester_id);
  if (friendIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, current_streak')
    .in('id', friendIds);

  if (!profiles) return [];

  return rows.map((r) => {
    const fId = r.requester_id === userId ? r.addressee_id : r.requester_id;
    const p = profiles.find((pr) => pr.id === fId);
    return {
      friendship_id: r.id,
      friend_id: fId,
      friend_username: p?.username ?? 'unknown',
      friend_avatar_url: p?.avatar_url ?? null,
      friend_current_streak: p?.current_streak ?? 0,
      status: r.status,
    };
  });
}

export async function getPendingRequests(userId: string): Promise<PendingRequest[]> {
  const { data, error } = await supabase.rpc('get_pending_requests', { p_user_id: userId });
  if (!error) return data ?? [];

  // Fallback: direct query
  const { data: rows, error: fbError } = await supabase
    .from('friendships')
    .select('id, requester_id, created_at')
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (fbError || !rows || rows.length === 0) return [];

  const reqIds = rows.map((r) => r.requester_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', reqIds);

  return rows.map((r) => {
    const p = profiles?.find((pr) => pr.id === r.requester_id);
    return {
      friendship_id: r.id,
      requester_id: r.requester_id,
      requester_username: p?.username ?? 'unknown',
      requester_avatar_url: p?.avatar_url ?? null,
      created_at: r.created_at,
    };
  });
}

export async function getFriendsDescriptions(userId: string, wordId: string): Promise<FriendDescription[]> {
  const { data, error } = await supabase.rpc('get_friends_descriptions', {
    p_user_id: userId,
    p_word_id: wordId,
  });
  if (error) {
    // Silently fail — friends descriptions are a nice-to-have
    return [];
  }
  return data ?? [];
}

export async function searchUsers(query: string, currentUserId: string): Promise<UserSearchResult[]> {
  // Try RPC first
  const { data, error } = await supabase.rpc('search_users', {
    p_query: query,
    p_current_user: currentUserId,
  });

  if (!error) return data ?? [];

  // Fallback: direct table query if RPC doesn't exist yet
  console.warn('search_users RPC failed, using fallback:', error.message);
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, current_streak')
    .ilike('username', `%${query}%`)
    .neq('id', currentUserId)
    .limit(10);

  if (profileError || !profiles) return [];

  return profiles.map((p) => ({
    user_id: p.id,
    username: p.username,
    avatar_url: p.avatar_url,
    current_streak: p.current_streak,
    is_friend: false,
    request_pending: false,
  }));
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('friendships').insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: 'pending',
  });
  if (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      return { error: new Error('Friends feature not yet set up. Please run the database migration.') };
    }
    return { error: new Error(error.message) };
  }
  return { error: null };
}

export async function acceptFriendRequest(friendshipId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function declineFriendRequest(friendshipId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function removeFriend(friendshipId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}
