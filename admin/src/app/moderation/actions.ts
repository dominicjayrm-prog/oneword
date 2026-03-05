'use server';

import { createAdminClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { isAuthenticated } from '@/lib/auth';

async function requireAuth() {
  if (!(await isAuthenticated())) throw new Error('Not authenticated');
}

export async function dismissReport(formData: FormData) {
  await requireAuth();
  const supabase = createAdminClient();
  const reportId = formData.get('reportId') as string;

  await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
  revalidatePath('/moderation');
}

export async function removeDescription(formData: FormData) {
  await requireAuth();
  const supabase = createAdminClient();
  const descriptionId = formData.get('descriptionId') as string;

  // Mark all reports for this description as 'removed'
  await supabase.from('reports').update({ status: 'removed' }).eq('description_id', descriptionId);

  // Delete the description (cascades to votes referencing it)
  await supabase.from('descriptions').delete().eq('id', descriptionId);

  revalidatePath('/moderation');
}
