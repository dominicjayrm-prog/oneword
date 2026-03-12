'use server';

import { createAdminClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { isAuthenticated } from '@/lib/auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUuid(value: unknown, name: string): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new Error(`Invalid ${name}: must be a valid UUID`);
  }
  return value;
}

async function requireAuth() {
  if (!(await isAuthenticated())) throw new Error('Not authenticated');
}

export async function shadowBanUser(formData: FormData) {
  await requireAuth();
  const supabase = createAdminClient();
  const userId = requireUuid(formData.get('userId'), 'userId');
  const reason = (formData.get('reason') as string) || 'Reported by community';
  const adminNote = (formData.get('adminNote') as string) || '';

  // Update profile
  await supabase
    .from('profiles')
    .update({
      is_shadowbanned: true,
      shadowbanned_at: new Date().toISOString(),
      shadowban_reason: reason,
    })
    .eq('id', userId);

  // Log the action
  await supabase.from('ban_log').insert({
    user_id: userId,
    action: 'shadowban',
    reason,
    admin_note: adminNote,
  });

  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  revalidatePath('/moderation');
}

export async function removeShadowBan(formData: FormData) {
  await requireAuth();
  const supabase = createAdminClient();
  const userId = requireUuid(formData.get('userId'), 'userId');
  const adminNote = (formData.get('adminNote') as string) || '';

  // Update profile
  await supabase
    .from('profiles')
    .update({
      is_shadowbanned: false,
      shadowbanned_at: null,
      shadowban_reason: null,
    })
    .eq('id', userId);

  // Log the action
  await supabase.from('ban_log').insert({
    user_id: userId,
    action: 'unshadowban',
    reason: 'Ban removed',
    admin_note: adminNote,
  });

  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
  revalidatePath('/moderation');
}

export async function searchUsers(query: string) {
  if (!query || query.length < 1) return [];
  const supabase = createAdminClient();
  const safeQuery = query.replace(/[%_\\]/g, '\\$&');
  const { data } = await supabase
    .from('profiles')
    .select('id, username, current_streak, total_plays, total_votes_received, is_shadowbanned, created_at, last_played_date')
    .ilike('username', `%${safeQuery}%`)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}
