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
  if (error) {
    console.error('getFriends error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getPendingRequests(userId: string): Promise<PendingRequest[]> {
  const { data, error } = await supabase.rpc('get_pending_requests', { p_user_id: userId });
  if (error) {
    console.error('getPendingRequests error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getFriendsDescriptions(userId: string, wordId: string): Promise<FriendDescription[]> {
  const { data, error } = await supabase.rpc('get_friends_descriptions', {
    p_user_id: userId,
    p_word_id: wordId,
  });
  if (error) {
    console.error('getFriendsDescriptions error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function searchUsers(query: string, currentUserId: string): Promise<UserSearchResult[]> {
  const { data, error } = await supabase.rpc('search_users', {
    p_query: query,
    p_current_user: currentUserId,
  });
  if (error) {
    console.error('searchUsers error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('friendships').insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: 'pending',
  });
  if (error) return { error: new Error(error.message) };
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
