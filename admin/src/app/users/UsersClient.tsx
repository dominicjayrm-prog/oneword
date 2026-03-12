'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { searchUsers } from './actions';

export function UsersClient({ initialUsers }: { initialUsers: any[] }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState(initialUsers);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length === 0) {
      setUsers(initialUsers);
      return;
    }
    if (q.length < 2) return;
    setSearching(true);
    try {
      const results = await searchUsers(q);
      setUsers(results);
    } finally {
      setSearching(false);
    }
  }, [initialUsers]);

  return (
    <>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by username..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
        {searching && <span style={{ marginLeft: 12, color: 'var(--text-muted)', fontSize: 13 }}>Searching...</span>}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Status</th>
              <th>Streak</th>
              <th>Total Plays</th>
              <th>Votes Received</th>
              <th>Last Played</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>
                  <Link href={`/users/${u.id}`} style={{ color: 'var(--accent)' }}>
                    {u.username}
                  </Link>
                </td>
                <td>
                  {u.is_shadowbanned ? (
                    <span className="badge" style={{ background: '#ef444422', color: 'var(--danger)' }}>
                      Shadow Banned
                    </span>
                  ) : (
                    <span className="badge badge-success">Active</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${u.current_streak > 0 ? 'badge-success' : 'badge-muted'}`}>
                    {u.current_streak}
                  </span>
                </td>
                <td>{u.total_plays}</td>
                <td>{u.total_votes_received}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {u.last_played_date
                    ? new Date(u.last_played_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'Never'}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td>
                  <Link href={`/users/${u.id}`} className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 12 }}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                  {query ? 'No users found' : 'No users yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
