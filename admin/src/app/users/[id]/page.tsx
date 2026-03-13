import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { formatDescription } from '@/lib/format';
import { NavBar } from '@/components/NavBar';
import { shadowBanUser, removeShadowBan } from '../actions';

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) redirect('/login');
  const { id } = await params;
  const supabase = createAdminClient();

  // Fetch user profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (!profile) notFound();

  // Fetch all data in parallel
  const [descriptionsRes, , banLogRes, moderationLogRes] = await Promise.all([
    supabase
      .from('descriptions')
      .select('id, description, vote_count, rank, created_at, word_id')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    // Placeholder — real reports-on-user fetched below via description IDs
    Promise.resolve({ data: [] }),
    supabase
      .from('ban_log')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('moderation_log')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  // Also get reports where this user's descriptions were reported
  const descriptionIds = (descriptionsRes.data || []).map((d: any) => d.id);
  const reportsOnUserRes = descriptionIds.length > 0
    ? await supabase
        .from('reports')
        .select('id, reason, status, created_at, description_id, reporter_id')
        .in('description_id', descriptionIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  // Get word info for descriptions
  const wordIds = [...new Set((descriptionsRes.data || []).map((d: any) => d.word_id))];
  const wordsRes = wordIds.length > 0
    ? await supabase.from('daily_words').select('id, word, date').in('id', wordIds)
    : { data: [] };
  const wordMap = new Map((wordsRes.data || []).map((w: any) => [w.id, w]));

  const descriptions = (descriptionsRes.data || []).map((d: any) => ({
    ...d,
    word: wordMap.get(d.word_id)?.word ?? '?',
    wordDate: wordMap.get(d.word_id)?.date ?? '',
  }));

  const reportsOnUser = reportsOnUserRes.data || [];
  const banLog = banLogRes.data || [];
  const moderationLog = moderationLogRes.data || [];

  return (
    <>
      <NavBar />
      <div className="container">
        <div className="mb-6">
          <Link href="/users" style={{ color: 'var(--text-muted)', fontSize: 13 }}>&larr; Back to Users</Link>
        </div>

        <div className="flex-between mb-6">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>{profile.username}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {profile.last_played_date && (
                <> &middot; Last played {new Date(profile.last_played_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
              )}
            </p>
          </div>
          {profile.is_shadowbanned ? (
            <span className="badge" style={{ background: '#ef444422', color: 'var(--danger)', fontSize: 14, padding: '6px 16px' }}>
              Shadow Banned
            </span>
          ) : (
            <span className="badge badge-success" style={{ fontSize: 14, padding: '6px 16px' }}>Active</span>
          )}
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">Current Streak</div>
            <div className="value">{profile.current_streak}</div>
          </div>
          <div className="stat-card">
            <div className="label">Longest Streak</div>
            <div className="value">{profile.longest_streak}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Plays</div>
            <div className="value">{profile.total_plays}</div>
          </div>
          <div className="stat-card">
            <div className="label">Votes Received</div>
            <div className="value">{profile.total_votes_received}</div>
          </div>
          <div className="stat-card">
            <div className="label">Best Rank</div>
            <div className="value">{profile.best_rank ? `#${profile.best_rank}` : '-'}</div>
          </div>
          <div className="stat-card">
            <div className="label">Times Reported</div>
            <div className="value" style={{ color: reportsOnUser.length > 0 ? 'var(--danger)' : undefined }}>
              {reportsOnUser.length}
            </div>
          </div>
        </div>

        {/* Shadow Ban Actions */}
        <div className="card mb-6">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Moderation Actions</h2>
          {profile.is_shadowbanned ? (
            <div>
              <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
                Banned on {profile.shadowbanned_at ? new Date(profile.shadowbanned_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'unknown date'}
                {profile.shadowban_reason && <> &mdash; Reason: <strong>{profile.shadowban_reason}</strong></>}
              </p>
              <form action={removeShadowBan}>
                <input type="hidden" name="userId" value={id} />
                <div className="form-group">
                  <label>Note (optional)</label>
                  <input type="text" name="adminNote" placeholder="Reason for removing ban..." />
                </div>
                <button type="submit" className="btn btn-success">Remove Shadow Ban</button>
              </form>
            </div>
          ) : (
            <form action={shadowBanUser}>
              <input type="hidden" name="userId" value={id} />
              <div className="form-group">
                <label>Reason</label>
                <select name="reason" style={{ maxWidth: 300 }}>
                  <option value="Offensive content">Offensive content</option>
                  <option value="Spam/gibberish">Spam/gibberish</option>
                  <option value="Harassment">Harassment</option>
                  <option value="Reported by community">Reported by community</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Admin Note (optional)</label>
                <input type="text" name="adminNote" placeholder="Additional context..." />
              </div>
              <button type="submit" className="btn btn-danger">Shadow Ban User</button>
            </form>
          )}
        </div>

        {/* Submission History */}
        <div className="card mb-6">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            Submission History ({descriptions.length})
          </h2>
          {descriptions.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Word</th>
                  <th>Date</th>
                  <th>Votes</th>
                  <th>Rank</th>
                </tr>
              </thead>
              <tbody>
                {descriptions.map((d: any) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600, maxWidth: 300 }}>&ldquo;{formatDescription(d.description)}&rdquo;</td>
                    <td><span className="badge badge-muted">{d.word}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {d.wordDate ? new Date(d.wordDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                    </td>
                    <td>{d.vote_count}</td>
                    <td>{d.rank ? `#${d.rank}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No submissions yet</p>
          )}
        </div>

        {/* Report History */}
        {reportsOnUser.length > 0 && (
          <div className="card mb-6">
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
              Reports Received ({reportsOnUser.length})
            </h2>
            <table>
              <thead>
                <tr>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {reportsOnUser.map((r: any) => (
                  <tr key={r.id}>
                    <td><span className="badge badge-warning">{r.reason}</span></td>
                    <td>
                      <span className={`badge ${r.status === 'removed' ? 'badge-success' : r.status === 'pending' ? 'badge-warning' : 'badge-muted'}`}>
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

        {/* Ban Log */}
        {banLog.length > 0 && (
          <div className="card mb-6">
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
              Ban History ({banLog.length})
            </h2>
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Reason</th>
                  <th>Note</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {banLog.map((b: any) => (
                  <tr key={b.id}>
                    <td>
                      <span className={`badge ${b.action === 'shadowban' ? 'badge-warning' : 'badge-success'}`} style={{ textTransform: 'capitalize' }}>
                        {b.action === 'shadowban' ? 'Shadow Banned' : 'Unbanned'}
                      </span>
                    </td>
                    <td>{b.reason || '-'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{b.admin_note || '-'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Moderation Log (blocked submissions) */}
        {moderationLog.length > 0 && (
          <div className="card mb-6">
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
              Blocked Submissions ({moderationLog.length})
            </h2>
            <table>
              <thead>
                <tr>
                  <th>Attempted Description</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {moderationLog.map((m: any) => (
                  <tr key={m.id}>
                    <td style={{ maxWidth: 300, fontWeight: 600 }}>&ldquo;{m.attempted_description}&rdquo;</td>
                    <td><span className="badge badge-warning">{m.rejection_reason}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
