'use client';

import { useState, useCallback } from 'react';
import {
  getSubscribers,
  getSubscriberStats,
  getChartData,
  exportSubscribers,
  deleteSubscriber,
  deleteSubscribers,
  markAsNotified,
  markAllAsNotified,
} from './actions';

interface Stats {
  total: number;
  english: number;
  spanish: number;
  thisWeek: number;
}

interface Subscriber {
  id: string;
  email: string;
  language: string;
  source: string | null;
  referrer: string | null;
  subscribed_at: string;
  is_launched_notified: boolean;
}

interface ChartPoint {
  date: string;
  count: number;
}

interface Props {
  initialStats: Stats;
  initialSubscribers: Subscriber[];
  initialCount: number;
  initialChartData: ChartPoint[];
}

type SortField = 'email' | 'language' | 'source' | 'referrer' | 'subscribed_at' | 'is_launched_notified';

export function SubscribersClient({ initialStats, initialSubscribers, initialCount, initialChartData }: Props) {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [subscribers, setSubscribers] = useState<Subscriber[]>(initialSubscribers);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [chartData, setChartData] = useState<ChartPoint[]>(initialChartData);

  // Filters
  const [language, setLanguage] = useState('');
  const [notified, setNotified] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Pagination & sorting
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>('subscribed_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // UI state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pageSize = 25;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  const refresh = useCallback(async (opts?: { p?: number; sort?: SortField; order?: 'asc' | 'desc'; lang?: string; notif?: string; q?: string }) => {
    setLoading(true);
    try {
      const p = opts?.p ?? page;
      const [{ data, count }, newStats, newChart] = await Promise.all([
        getSubscribers({
          language: opts?.lang ?? language,
          notified: opts?.notif ?? notified,
          search: opts?.q ?? search,
          page: p,
          pageSize,
          sortBy: opts?.sort ?? sortBy,
          sortOrder: opts?.order ?? sortOrder,
        }),
        getSubscriberStats(),
        getChartData(),
      ]);
      setSubscribers(data);
      setTotalCount(count);
      setStats(newStats);
      setChartData(newChart);
      setSelected(new Set());
    } catch {
      setMessage({ type: 'error', text: 'Failed to fetch subscribers' });
    }
    setLoading(false);
  }, [page, language, notified, search, sortBy, sortOrder]);

  function handleSort(field: SortField) {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(field);
    setSortOrder(newOrder);
    setPage(1);
    refresh({ p: 1, sort: field, order: newOrder });
  }

  function handleFilter(type: 'language' | 'notified', value: string) {
    if (type === 'language') setLanguage(value);
    else setNotified(value);
    setPage(1);
    refresh({
      p: 1,
      lang: type === 'language' ? value : language,
      notif: type === 'notified' ? value : notified,
    });
  }

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
    refresh({ p: 1, q: searchInput });
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    refresh({ p: newPage });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === subscribers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(subscribers.map((s) => s.id)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this subscriber?')) return;
    try {
      await deleteSubscriber(id);
      setMessage({ type: 'success', text: 'Subscriber removed' });
      refresh();
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete' });
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Remove ${selected.size} subscriber(s)?`)) return;
    try {
      await deleteSubscribers(Array.from(selected));
      setMessage({ type: 'success', text: `${selected.size} subscriber(s) removed` });
      refresh();
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete' });
    }
  }

  async function handleBulkNotify() {
    if (!confirm(`Mark ${selected.size} subscriber(s) as notified?`)) return;
    try {
      await markAsNotified(Array.from(selected));
      setMessage({ type: 'success', text: `${selected.size} marked as notified` });
      refresh();
    } catch {
      setMessage({ type: 'error', text: 'Failed to update' });
    }
  }

  async function handleMarkAllNotified() {
    const unnotified = stats.total - (subscribers.filter((s) => s.is_launched_notified).length);
    if (!confirm(`Mark all unnotified subscribers as notified? This indicates you've sent them the launch email.`)) return;
    try {
      const count = await markAllAsNotified();
      setMessage({ type: 'success', text: `${count} subscriber(s) marked as notified` });
      refresh();
    } catch {
      setMessage({ type: 'error', text: 'Failed to update' });
    }
  }

  async function handleExport() {
    try {
      const csv = await exportSubscribers({ language, notified });
      if (!csv) return;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oneword-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ type: 'error', text: 'Failed to export' });
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function sortArrow(field: SortField) {
    if (sortBy !== field) return '';
    return sortOrder === 'asc' ? ' \u2191' : ' \u2193';
  }

  // Chart rendering
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);
  const chartWidth = 100; // percentage
  const chartHeight = 120;
  const barWidth = chartWidth / chartData.length;

  return (
    <>
      {/* Stats cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="label">Total Subscribers</div>
          <div className="value">{stats.total}</div>
          <div style={{ fontSize: 13, color: stats.thisWeek > 0 ? 'var(--success)' : 'var(--text-muted)', marginTop: 4 }}>
            {stats.thisWeek > 0 ? `+${stats.thisWeek} this week` : 'No new this week'}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">English Subscribers</div>
          <div className="value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {stats.english} <span style={{ fontSize: 14 }}>EN</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Spanish Subscribers</div>
          <div className="value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {stats.spanish} <span style={{ fontSize: 14 }}>ES</span>
          </div>
        </div>
      </div>

      {/* Growth chart */}
      <div className="card mb-6">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Signups — Last 30 Days</h2>
        </div>
        <div style={{ position: 'relative', height: chartHeight, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
          {chartData.map((point, i) => {
            const height = maxCount > 0 ? (point.count / maxCount) * (chartHeight - 20) : 0;
            const dayLabel = new Date(point.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <div
                key={point.date}
                title={`${dayLabel}: ${point.count} signup${point.count !== 1 ? 's' : ''}`}
                style={{
                  flex: 1,
                  height: Math.max(height, 2),
                  background: point.count > 0 ? 'var(--accent)' : 'var(--surface-2)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.2s',
                  cursor: 'default',
                  opacity: point.count > 0 ? 1 : 0.4,
                }}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>{chartData[0] ? new Date(chartData[0].date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          <span>{chartData[chartData.length - 1] ? new Date(chartData[chartData.length - 1].date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className="card mb-4"
          style={{
            borderColor: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            background: message.type === 'success' ? '#2ECC7111' : '#ef444411',
            padding: 12,
          }}
        >
          <div className="flex-between">
            <span style={{ color: message.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: 14 }}>
              {message.text}
            </span>
            <button
              onClick={() => setMessage(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: filters, search, actions */}
      <div className="card mb-4" style={{ padding: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {/* Language filter */}
          <select
            value={language}
            onChange={(e) => handleFilter('language', e.target.value)}
            style={{ width: 'auto', minWidth: 120 }}
          >
            <option value="">All Languages</option>
            <option value="en">English</option>
            <option value="es">Spanish</option>
          </select>

          {/* Notified filter */}
          <select
            value={notified}
            onChange={(e) => handleFilter('notified', e.target.value)}
            style={{ width: 'auto', minWidth: 160 }}
          >
            <option value="">All Status</option>
            <option value="false">Not Yet Notified</option>
            <option value="true">Already Notified</option>
          </select>

          {/* Search */}
          <div style={{ display: 'flex', gap: 4, flex: 1, minWidth: 200 }}>
            <input
              type="text"
              placeholder="Search by email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button className="btn btn-outline" onClick={handleSearch} style={{ padding: '8px 14px' }}>
              Search
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button className="btn btn-outline" onClick={handleMarkAllNotified}>
              Mark All as Notified
            </button>
            <button className="btn btn-primary" onClick={handleExport}>
              Export CSV
            </button>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{selected.size} selected</span>
            <button className="btn btn-outline" onClick={handleBulkNotify} style={{ padding: '6px 14px', fontSize: 13 }}>
              Mark as Notified
            </button>
            <button className="btn btn-danger" onClick={handleBulkDelete} style={{ padding: '6px 14px', fontSize: 13 }}>
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 14, color: 'var(--text-muted)' }}>
          {totalCount === 0
            ? 'No subscribers found'
            : `Showing ${startItem}-${endItem} of ${totalCount} subscribers`}
        </div>

        {loading && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        )}

        {!loading && subscribers.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === subscribers.length && subscribers.length > 0}
                      onChange={toggleSelectAll}
                      style={{ width: 'auto', cursor: 'pointer' }}
                    />
                  </th>
                  <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                    Email{sortArrow('email')}
                  </th>
                  <th onClick={() => handleSort('language')} style={{ cursor: 'pointer' }}>
                    Language{sortArrow('language')}
                  </th>
                  <th onClick={() => handleSort('source')} style={{ cursor: 'pointer' }}>
                    Source{sortArrow('source')}
                  </th>
                  <th>Referrer</th>
                  <th onClick={() => handleSort('subscribed_at')} style={{ cursor: 'pointer' }}>
                    Signed Up{sortArrow('subscribed_at')}
                  </th>
                  <th onClick={() => handleSort('is_launched_notified')} style={{ cursor: 'pointer' }}>
                    Notified{sortArrow('is_launched_notified')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(sub.id)}
                        onChange={() => toggleSelect(sub.id)}
                        style={{ width: 'auto', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ fontWeight: 500 }}>{sub.email}</td>
                    <td>
                      <span className={`badge ${sub.language === 'en' ? 'badge-success' : 'badge-warning'}`}>
                        {sub.language === 'en' ? 'EN' : 'ES'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{sub.source || '—'}</td>
                    <td
                      title={sub.referrer || undefined}
                      style={{ color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {sub.referrer || '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(sub.subscribed_at)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {sub.is_launched_notified ? (
                        <span style={{ color: 'var(--success)', fontSize: 18 }}>&#10003;</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => handleDelete(sub.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: 13 }}
              disabled={page === 1}
              onClick={() => handlePageChange(page - 1)}
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`btn ${page === pageNum ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '6px 12px', fontSize: 13, minWidth: 36 }}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: 13 }}
              disabled={page === totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
