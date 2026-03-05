import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { NavBar } from '@/components/NavBar';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  if (!(await isAuthenticated())) redirect('/login');
  const supabase = createAdminClient();

  const [wordsRes, profilesRes, descriptionsRes, votesRes, todayWordRes, upcomingRes] = await Promise.all([
    supabase.from('daily_words').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('descriptions').select('*', { count: 'exact', head: true }),
    supabase.from('votes').select('*', { count: 'exact', head: true }),
    supabase.rpc('get_today_word'),
    supabase.from('daily_words').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date', { ascending: true }).limit(7),
  ]);

  const todayWord = todayWordRes.data?.[0];
  const upcoming = upcomingRes.data || [];

  return (
    <>
      <NavBar />
      <div className="container">
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">Total Words Loaded</div>
            <div className="value">{wordsRes.count ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Users</div>
            <div className="value">{profilesRes.count ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Descriptions</div>
            <div className="value">{descriptionsRes.count ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Votes</div>
            <div className="value">{votesRes.count ?? 0}</div>
          </div>
        </div>

        <div className="card mb-6">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Today&apos;s Word</h2>
          {todayWord ? (
            <div>
              <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: 4 }}>{todayWord.word}</span>
              <span className="badge badge-success" style={{ marginLeft: 12 }}>{todayWord.category}</span>
            </div>
          ) : (
            <div style={{ color: 'var(--danger)' }}>No word set for today! Go to Words to add one.</div>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Upcoming Words</h2>
          {upcoming.length > 0 ? (
            <table>
              <thead>
                <tr><th>Date</th><th>Word</th><th>Category</th></tr>
              </thead>
              <tbody>
                {upcoming.map((w: any) => (
                  <tr key={w.id}>
                    <td>{new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td style={{ fontWeight: 600 }}>{w.word}</td>
                    <td><span className="badge badge-muted">{w.category}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No upcoming words. Add some in the Words section.</p>
          )}
        </div>
      </div>
    </>
  );
}
