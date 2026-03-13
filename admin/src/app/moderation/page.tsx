import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { formatDescription } from '@/lib/format';
import { NavBar } from '@/components/NavBar';
import { dismissReport, removeDescription, shadowBanFromReport } from './actions';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  if (!(await isAuthenticated())) redirect('/login');
  const supabase = createAdminClient();

  // Get reports
  const { data: reports } = await supabase
    .from('reports')
    .select('id, reason, status, created_at, description_id, reporter_id, word_id')
    .order('created_at', { ascending: false })
    .limit(100);

  const reportsList = reports || [];

  // Collect unique IDs for batch fetching
  const descIds = [...new Set(reportsList.map((r) => r.description_id))];
  const reporterIds = [...new Set(reportsList.map((r) => r.reporter_id))];
  const wordIds = [...new Set(reportsList.map((r) => r.word_id))];

  // Batch fetch all related data in parallel (instead of N+1 loop)
  const [descsRes, reportersRes, wordsRes] = await Promise.all([
    descIds.length > 0 ? supabase.from('descriptions').select('id, description, user_id').in('id', descIds) : { data: [] },
    reporterIds.length > 0 ? supabase.from('profiles').select('id, username').in('id', reporterIds) : { data: [] },
    wordIds.length > 0 ? supabase.from('daily_words').select('id, word, date').in('id', wordIds) : { data: [] },
  ]);

  const descMap = new Map((descsRes.data || []).map((d: any) => [d.id, d]));
  const profileMap = new Map((reportersRes.data || []).map((p: any) => [p.id, p]));
  const wordMap = new Map((wordsRes.data || []).map((w: any) => [w.id, w]));

  // Batch fetch author usernames
  const authorIds = [...new Set([...descMap.values()].map((d: any) => d.user_id).filter(Boolean))];
  const authorsRes = authorIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', authorIds)
    : { data: [] };
  const authorMap = new Map((authorsRes.data || []).map((a: any) => [a.id, a]));

  const enriched = reportsList.map((report) => {
    const desc = descMap.get(report.description_id);
    const reporter = profileMap.get(report.reporter_id);
    const word = wordMap.get(report.word_id);
    const author = desc ? authorMap.get(desc.user_id) : null;
    return {
      ...report,
      descriptionText: desc?.description ?? '[deleted]',
      reporterUsername: reporter?.username ?? 'unknown',
      authorUsername: author?.username ?? 'unknown',
      authorId: desc?.user_id ?? null,
      word: word?.word ?? 'unknown',
      wordDate: word?.date ?? '',
    };
  });

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
                    <td style={{ fontWeight: 600, maxWidth: 250 }}>&ldquo;{formatDescription(r.descriptionText)}&rdquo;</td>
                    <td>{r.authorUsername}</td>
                    <td><span className="badge badge-muted">{r.word}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.reporterUsername}</td>
                    <td><span className="badge badge-warning">{r.reason}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
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
                        {r.authorId && (
                          <form action={shadowBanFromReport}>
                            <input type="hidden" name="userId" value={r.authorId} />
                            <input type="hidden" name="descriptionId" value={r.description_id} />
                            <button type="submit" className="btn" style={{ padding: '4px 12px', fontSize: 12, background: 'var(--warning)', color: '#000', fontWeight: 700 }}>
                              Shadow Ban
                            </button>
                          </form>
                        )}
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
                    <td style={{ maxWidth: 300 }}>&ldquo;{formatDescription(r.descriptionText)}&rdquo;</td>
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
