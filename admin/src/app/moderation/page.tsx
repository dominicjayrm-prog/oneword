import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { NavBar } from '@/components/NavBar';
import { dismissReport, removeDescription } from './actions';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  if (!(await isAuthenticated())) redirect('/login');
  const supabase = createAdminClient();

  // Get pending reports with description and reporter info
  const { data: reports } = await supabase
    .from('reports')
    .select(`
      id,
      reason,
      status,
      created_at,
      description_id,
      reporter_id,
      word_id
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  // Enrich with description text, reporter username, and word
  const enriched = [];
  for (const report of reports || []) {
    const [descRes, reporterRes, wordRes] = await Promise.all([
      supabase.from('descriptions').select('description, user_id').eq('id', report.description_id).single(),
      supabase.from('profiles').select('username').eq('id', report.reporter_id).single(),
      supabase.from('daily_words').select('word, date').eq('id', report.word_id).single(),
    ]);

    let authorUsername = null;
    if (descRes.data?.user_id) {
      const authorRes = await supabase.from('profiles').select('username').eq('id', descRes.data.user_id).single();
      authorUsername = authorRes.data?.username;
    }

    enriched.push({
      ...report,
      descriptionText: descRes.data?.description ?? '[deleted]',
      reporterUsername: reporterRes.data?.username ?? 'unknown',
      authorUsername: authorUsername ?? 'unknown',
      word: wordRes.data?.word ?? 'unknown',
      wordDate: wordRes.data?.date ?? '',
    });
  }

  const pending = enriched.filter((r) => r.status === 'pending');
  const resolved = enriched.filter((r) => r.status !== 'pending');

  return (
    <>
      <NavBar />
      <div className="container">
        <div className="flex-between mb-6">
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Moderation</h1>
          <span className="badge badge-warning">{pending.length} pending</span>
        </div>

        {pending.length === 0 && (
          <div className="card mb-6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No pending reports. All clear!
          </div>
        )}

        {pending.length > 0 && (
          <div className="card mb-6">
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Pending Reports</h2>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Author</th>
                  <th>Word</th>
                  <th>Reported By</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, maxWidth: 250 }}>&ldquo;{r.descriptionText}&rdquo;</td>
                    <td>{r.authorUsername}</td>
                    <td><span className="badge badge-muted">{r.word}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.reporterUsername}</td>
                    <td><span className="badge badge-warning">{r.reason}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <form action={removeDescription}>
                          <input type="hidden" name="descriptionId" value={r.description_id} />
                          <button type="submit" className="btn btn-danger" style={{ padding: '4px 12px', fontSize: 12 }}>
                            Remove
                          </button>
                        </form>
                        <form action={dismissReport}>
                          <input type="hidden" name="reportId" value={r.id} />
                          <button type="submit" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 12 }}>
                            Dismiss
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {resolved.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Resolved Reports</h2>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((r) => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 300 }}>&ldquo;{r.descriptionText}&rdquo;</td>
                    <td>{r.authorUsername}</td>
                    <td>
                      <span className={`badge ${r.status === 'removed' ? 'badge-success' : 'badge-muted'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
