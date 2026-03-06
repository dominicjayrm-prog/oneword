'use server';

import { createAdminClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { isAuthenticated } from '@/lib/auth';

async function requireAuth() {
  if (!(await isAuthenticated())) throw new Error('Not authenticated');
}

export async function addWord(formData: FormData) {
  await requireAuth();
  const supabase = createAdminClient();
  const word = (formData.get('word') as string).toUpperCase().trim();
  const date = formData.get('date') as string;
  const category = (formData.get('category') as string) || 'general';
  const language = (formData.get('language') as string) || 'en';

  const { error } = await supabase.from('daily_words').insert({ word, date, category, language });
  if (error) throw new Error(error.message);
  revalidatePath('/words');
}

export async function updateWord(formData: FormData) {
  await requireAuth();
  const supabase = createAdminClient();
  const id = formData.get('id') as string;
  const word = (formData.get('word') as string).toUpperCase().trim();
  const date = formData.get('date') as string;
  const category = (formData.get('category') as string) || 'general';
  const language = (formData.get('language') as string) || 'en';

  const { error } = await supabase.from('daily_words').update({ word, date, category, language }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/words');
}

export async function deleteWord(formData: FormData) {
  await requireAuth();
  const supabase = createAdminClient();
  const id = formData.get('id') as string;

  const { error } = await supabase.from('daily_words').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/words');
}

export async function bulkUploadWords(formData: FormData) {
  await requireAuth();
  const supabase = createAdminClient();
  const wordsJson = formData.get('words') as string;

  let words: Array<{ word: string; date: string; category: string; language?: string }>;
  try {
    words = JSON.parse(wordsJson);
  } catch {
    throw new Error('Invalid JSON');
  }

  // Validate
  for (const w of words) {
    if (!w.word || !w.date) throw new Error(`Missing word or date in entry: ${JSON.stringify(w)}`);
  }

  // Normalize
  const normalized = words.map((w) => ({
    word: w.word.toUpperCase().trim(),
    date: w.date,
    category: w.category || 'general',
    language: w.language || 'en',
  }));

  // Insert in batches of 100
  for (let i = 0; i < normalized.length; i += 100) {
    const batch = normalized.slice(i, i + 100);
    const { error } = await supabase.from('daily_words').upsert(batch, { onConflict: 'date,language' });
    if (error) throw new Error(`Batch ${i / 100 + 1} failed: ${error.message}`);
  }

  revalidatePath('/words');
  return { count: normalized.length };
}
