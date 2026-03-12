import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { NavBar } from '@/components/NavBar';
import { UsersClient } from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  if (!(await isAuthenticated())) redirect('/login');
  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, current_streak, total_plays, total_votes_received, is_shadowbanned, created_at, last_played_date')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <>
      <NavBar />
      <div className="container">
        <div className="flex-between mb-6">
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Users</h1>
          <span style={{ color: 'var(--text-muted)' }}>{(profiles || []).length} shown</span>
        </div>
        <UsersClient initialUsers={profiles || []} />
      </div>
    </>
  );
}
