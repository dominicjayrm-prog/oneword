import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { NavBar } from '@/components/NavBar';
import { WordsClient } from './WordsClient';

export const dynamic = 'force-dynamic';

export default async function WordsPage() {
  if (!(await isAuthenticated())) redirect('/login');
  const supabase = createAdminClient();

  const { data: words } = await supabase
    .from('daily_words')
    .select('*')
    .order('date', { ascending: true });

  return (
    <>
      <NavBar />
      <div className="container">
        <WordsClient words={words || []} />
      </div>
    </>
  );
}
