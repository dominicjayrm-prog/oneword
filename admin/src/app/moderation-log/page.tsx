import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { NavBar } from '@/components/NavBar';

export const dynamic = 'force-dynamic';

export default async function ModerationLogPage() {
  if (!(await isAuthenticated())) redirect('/login');
  const supabase = createAdminClient();

  const { data: logs } = await supabase
    .from('ban_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const banLogs = logs || [];

  // Batch fetch user profiles
  const userIds = [...new Set(banLogs.map((l) => l.user_id))];
  const profilesRes = userIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', userIds)
    : { data: [] };
  const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

  return (
    <>
      <NavBar />
      <div className="container">
        <div className="flex-between mb-6">
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Moderation Log</h1>
          <span style={{ color: 'var(--text-muted)' }}>{banLogs.length} entries</span>
        </div>

        {banLogs.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No moderation actions yet.
          </div>
        )}

        {banLogs.length > 0 && (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Reason</th>
                  <th>Admin Note</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {banLogs.map((b: any) => {
                  const user = profileMap.get(b.user_id);
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>
                        <Link href={`/users/${b.user_id}`} style={{ color: 'var(--accent)' }}>
                          {user?.username ?? 'unknown'}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${b.action === 'shadowban' ? 'badge-warning' : 'badge-success'}`}>
                          {b.action === 'shadowban' ? 'Shadow Banned' : 'Unbanned'}
                        </span>
                      </td>
                      <td>{b.reason || '-'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 300 }}>{b.admin_note || '-'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {new Date(b.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
