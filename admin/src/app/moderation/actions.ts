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

export async function dismissReport(formData: FormData) {
  await requireAuth();
  const supabase = createAdminClient();
  const reportId = requireUuid(formData.get('reportId'), 'reportId');

  await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
  revalidatePath('/moderation');
}

export async function removeDescription(formData: FormData) {
  await requireAuth();
  const supabase = createAdminClient();
  const descriptionId = requireUuid(formData.get('descriptionId'), 'descriptionId');

  // Mark all reports for this description as 'removed'
  await supabase.from('reports').update({ status: 'removed' }).eq('description_id', descriptionId);

  // Delete the description (cascades to votes referencing it)
  await supabase.from('descriptions').delete().eq('id', descriptionId);

  revalidatePath('/moderation');
}

export async function shadowBanFromReport(formData: FormData) {
  await requireAuth();
  const supabase = createAdminClient();
  const userId = requireUuid(formData.get('userId'), 'userId');
  const descriptionId = requireUuid(formData.get('descriptionId'), 'descriptionId');

  // Shadow ban the user
  await supabase
    .from('profiles')
    .update({
      is_shadowbanned: true,
      shadowbanned_at: new Date().toISOString(),
      shadowban_reason: 'Reported by community',
    })
    .eq('id', userId);

  // Log the ban
  await supabase.from('ban_log').insert({
    user_id: userId,
    action: 'shadowban',
    reason: 'Reported by community',
    admin_note: `Banned from report on description ${descriptionId}`,
  });

  // Mark all reports for this description as 'removed'
  await supabase.from('reports').update({ status: 'removed' }).eq('description_id', descriptionId);

  revalidatePath('/moderation');
  revalidatePath('/users');
}
