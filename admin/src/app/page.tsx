import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { NavBar } from '@/components/NavBar';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  if (!(await isAuthenticated())) redirect('/login');
  const supabase = createAdminClient();

  const today = new Date().toISOString().split('T')[0];
  const [wordsRes, profilesRes, descriptionsRes, votesRes, todayWordsRes, upcomingRes] = await Promise.all([
    supabase.from('daily_words').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('descriptions').select('*', { count: 'exact', head: true }),
    supabase.from('votes').select('*', { count: 'exact', head: true }),
    supabase.from('daily_words').select('*').eq('date', today),
    supabase.from('daily_words').select('*').gt('date', today).order('date', { ascending: true }).limit(14),
  ]);

  const todayWords = todayWordsRes.data || [];
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
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Today&apos;s Words</h2>
          {todayWords.length > 0 ? (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {todayWords.map((w: any) => (
                <div key={w.id}>
                  <span style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)', marginRight: 8 }}>{w.language === 'en' ? 'English' : 'Spanish'}</span>
                  <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: 4 }}>{w.word}</span>
                  <span className="badge badge-success" style={{ marginLeft: 12 }}>{w.category}</span>
                </div>
              ))}
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
