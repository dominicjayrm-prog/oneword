'use server';

import { createAdminClient } from '@/lib/supabase';
import { isAuthenticated } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function requireAuth() {
  if (!(await isAuthenticated())) throw new Error('Not authenticated');
}

export async function getSubscriberStats() {
  await requireAuth();
  const supabase = createAdminClient();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [total, english, spanish, thisWeek] = await Promise.all([
    supabase
      .from('email_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('unsubscribed', false),
    supabase
      .from('email_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('unsubscribed', false)
      .eq('language', 'en'),
    supabase
      .from('email_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('unsubscribed', false)
      .eq('language', 'es'),
    supabase
      .from('email_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('unsubscribed', false)
      .gte('subscribed_at', weekAgo.toISOString()),
  ]);

  return {
    total: total.count || 0,
    english: english.count || 0,
    spanish: spanish.count || 0,
    thisWeek: thisWeek.count || 0,
  };
}

export async function getSubscribers(filters: {
  language?: string;
  notified?: string;
  search?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}) {
  await requireAuth();
  const supabase = createAdminClient();

  let query = supabase
    .from('email_subscribers')
    .select('*', { count: 'exact' })
    .eq('unsubscribed', false);

  if (filters.language) query = query.eq('language', filters.language);
  if (filters.notified === 'true') query = query.eq('is_launched_notified', true);
  if (filters.notified === 'false') query = query.eq('is_launched_notified', false);
  if (filters.search) query = query.ilike('email', `%${filters.search}%`);

  query = query
    .order(filters.sortBy, { ascending: filters.sortOrder === 'asc' })
    .range(
      (filters.page - 1) * filters.pageSize,
      filters.page * filters.pageSize - 1
    );

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return { data: data || [], count: count || 0 };
}

export async function getChartData() {
  await requireAuth();
  const supabase = createAdminClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabase
    .from('email_subscribers')
    .select('subscribed_at')
    .eq('unsubscribed', false)
    .gte('subscribed_at', thirtyDaysAgo.toISOString())
    .order('subscribed_at', { ascending: true });

  // Group by day
  const counts: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    counts[d.toISOString().split('T')[0]] = 0;
  }

  (data || []).forEach((row) => {
    const day = row.subscribed_at?.split('T')[0];
    if (day && counts[day] !== undefined) {
      counts[day]++;
    }
  });

  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}

export async function exportSubscribers(filters: {
  language?: string;
  notified?: string;
}) {
  await requireAuth();
  const supabase = createAdminClient();

  let query = supabase
    .from('email_subscribers')
    .select('email, language, source, referrer, subscribed_at')
    .eq('unsubscribed', false);

  if (filters.language) query = query.eq('language', filters.language);
  if (filters.notified === 'true') query = query.eq('is_launched_notified', true);
  if (filters.notified === 'false') query = query.eq('is_launched_notified', false);

  const { data } = await query.order('subscribed_at', { ascending: false });

  if (!data) return '';

  // Sanitize a field for safe CSV output:
  // 1. Escape embedded double-quotes by doubling them
  // 2. Strip leading formula characters (=, +, -, @, \t, \r) to prevent CSV injection
  function csvSafe(value: string): string {
    let safe = (value ?? '').replace(/"/g, '""');
    // Strip leading characters that could trigger formula execution in spreadsheets
    safe = safe.replace(/^[=+\-@\t\r]+/, '');
    return `"${safe}"`;
  }

  const csv = [
    'email,language,source,referrer,subscribed_at',
    ...data.map(
      (row) =>
        [
          csvSafe(row.email),
          csvSafe(row.language),
          csvSafe(row.source || ''),
          csvSafe(row.referrer || ''),
          csvSafe(row.subscribed_at),
        ].join(',')
    ),
  ].join('\n');

  return csv;
}

export async function deleteSubscriber(id: string) {
  await requireAuth();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('email_subscribers')
    .update({ unsubscribed: true })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/subscribers');
}

export async function deleteSubscribers(ids: string[]) {
  await requireAuth();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('email_subscribers')
    .update({ unsubscribed: true })
    .in('id', ids);

  if (error) throw new Error(error.message);
  revalidatePath('/subscribers');
}

export async function markAsNotified(ids: string[]) {
  await requireAuth();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('email_subscribers')
    .update({ is_launched_notified: true })
    .in('id', ids);

  if (error) throw new Error(error.message);
  revalidatePath('/subscribers');
}

export async function markAllAsNotified() {
  await requireAuth();
  const supabase = createAdminClient();

  const { count } = await supabase
    .from('email_subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('unsubscribed', false)
    .eq('is_launched_notified', false);

  const { error } = await supabase
    .from('email_subscribers')
    .update({ is_launched_notified: true })
    .eq('unsubscribed', false)
    .eq('is_launched_notified', false);

  if (error) throw new Error(error.message);
  revalidatePath('/subscribers');
  return count || 0;
}
