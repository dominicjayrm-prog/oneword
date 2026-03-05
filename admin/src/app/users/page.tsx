import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { NavBar } from '@/components/NavBar';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  if (!(await isAuthenticated())) redirect('/login');
  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const users = profiles || [];

  return (
    <>
      <NavBar />
      <div className="container">
        <div className="flex-between mb-6">
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Users</h1>
          <span style={{ color: 'var(--text-muted)' }}>{users.length} total</span>
        </div>

        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Streak</th>
                <th>Best Streak</th>
                <th>Total Plays</th>
                <th>Votes Received</th>
                <th>Best Rank</th>
                <th>Last Played</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td>
                    <span className={`badge ${u.current_streak > 0 ? 'badge-success' : 'badge-muted'}`}>
                      {u.current_streak}
                    </span>
                  </td>
                  <td>{u.longest_streak}</td>
                  <td>{u.total_plays}</td>
                  <td>{u.total_votes_received}</td>
                  <td>{u.best_rank ?? '-'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {u.last_played_date ? new Date(u.last_played_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
