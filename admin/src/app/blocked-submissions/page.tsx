import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';
import { formatDescription } from '@/lib/format';
import { NavBar } from '@/components/NavBar';

export const dynamic = 'force-dynamic';

export default async function BlockedSubmissionsPage() {
  if (!(await isAuthenticated())) redirect('/login');
  const supabase = createAdminClient();

  const { data: logs } = await supabase
    .from('moderation_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const entries = logs || [];

  // Batch fetch user profiles and words
  const userIds = [...new Set(entries.map((e) => e.user_id).filter(Boolean))];
  const wordIds = [...new Set(entries.map((e) => e.word_id).filter(Boolean))];

  const [profilesRes, wordsRes] = await Promise.all([
    userIds.length > 0 ? supabase.from('profiles').select('id, username').in('id', userIds) : { data: [] },
    wordIds.length > 0 ? supabase.from('daily_words').select('id, word, date').in('id', wordIds) : { data: [] },
  ]);

  const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
  const wordMap = new Map((wordsRes.data || []).map((w: any) => [w.id, w]));

  // Count by user to identify repeat offenders
  const userCounts = new Map<string, number>();
  for (const e of entries) {
    if (e.user_id) {
      userCounts.set(e.user_id, (userCounts.get(e.user_id) || 0) + 1);
    }
  }

  return (
    <>
      <NavBar />
      <div className="container">
        <div className="flex-between mb-6">
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Blocked Submissions</h1>
          <span style={{ color: 'var(--text-muted)' }}>{entries.length} blocked</span>
        </div>

        {entries.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No blocked submissions yet. The filters are watching.
          </div>
        )}

        {entries.length > 0 && (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Attempted Description</th>
                  <th>Rejection Reason</th>
                  <th>Word</th>
                  <th>Date</th>
                  <th>Attempts</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e: any) => {
                  const user = e.user_id ? profileMap.get(e.user_id) : null;
                  const word = e.word_id ? wordMap.get(e.word_id) : null;
                  const attempts = e.user_id ? (userCounts.get(e.user_id) || 0) : 0;
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>
                        {user ? (
                          <Link href={`/users/${e.user_id}`} style={{ color: 'var(--accent)' }}>
                            {user.username}
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>unknown</span>
                        )}
                      </td>
                      <td style={{ maxWidth: 300, fontWeight: 600 }}>&ldquo;{formatDescription(e.attempted_description)}&rdquo;</td>
                      <td>
                        <span className="badge badge-warning">{e.rejection_reason}</span>
                      </td>
                      <td>
                        {word ? <span className="badge badge-muted">{word.word}</span> : '-'}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </td>
                      <td>
                        <span className={`badge ${attempts >= 5 ? 'badge-warning' : 'badge-muted'}`} style={attempts >= 5 ? { fontWeight: 700 } : {}}>
                          {attempts}x
                        </span>
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
