'use client';

import { useState, useTransition } from 'react';
import { createSeedAccounts, runDailySeeds, getSeedStatus } from './actions';

interface SeedStatus {
  accounts: any[];
  enCount: number;
  esCount: number;
  totalDescriptions: number;
  unusedDescriptions: number;
  uniqueWordsCovered: number;
  todayWordEn: string | null;
  todayWordEs: string | null;
  todaySubmissionsEn: number;
  todaySubmissionsEs: number;
  todayWordEnId: string | null;
  todayWordEsId: string | null;
}

export function SeedAccountsClient({ initialStatus }: { initialStatus: SeedStatus }) {
  const [status, setStatus] = useState<SeedStatus>(initialStatus);
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [runReport, setRunReport] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const accounts = status.accounts.filter((a: any) => a.language === language);
  const todayWord = language === 'en' ? status.todayWordEn : status.todayWordEs;
  const todaySubmissions = language === 'en' ? status.todaySubmissionsEn : status.todaySubmissionsEs;

  async function handleCreateAccounts() {
    setCreating(true);
    setMessage(null);
    try {
      const result = await createSeedAccounts();
      setMessage({
        type: result.errors > 0 ? 'error' : 'success',
        text: `Created: ${result.created}, Already existed: ${result.existing}, Errors: ${result.errors}`,
      });
      const refreshed = await getSeedStatus();
      setStatus(refreshed);
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    }
    setCreating(false);
  }

  async function handleRunSeeds(lang: 'en' | 'es' | 'both') {
    startTransition(async () => {
      setMessage(null);
      setRunReport(null);
      try {
        const report = await runDailySeeds(lang);
        setRunReport(report);

        const langs = Object.keys(report);
        const hasError = langs.some((l) => report[l].error);
        const totalSubmitted = langs.reduce((sum, l) => sum + (report[l].submitted || 0), 0);

        setMessage({
          type: hasError && totalSubmitted === 0 ? 'error' : 'success',
          text: `Done! ${langs.map((l) => `${l.toUpperCase()}: ${report[l].submitted || 0} submitted, ${report[l].already_done || 0} already done, ${report[l].voting?.total_votes || 0} votes`).join(' | ')}`,
        });

        const refreshed = await getSeedStatus();
        setStatus(refreshed);
      } catch (err) {
        setMessage({ type: 'error', text: String(err) });
      }
    });
  }

  return (
    <>
      {/* Stats overview */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="label">English Accounts</div>
          <div className="value">{status.enCount}</div>
        </div>
        <div className="stat-card">
          <div className="label">Spanish Accounts</div>
          <div className="value">{status.esCount}</div>
        </div>
        <div className="stat-card">
          <div className="label">Descriptions Loaded</div>
          <div className="value">{status.totalDescriptions}</div>
        </div>
        <div className="stat-card">
          <div className="label">Unused Descriptions</div>
          <div className="value">{status.unusedDescriptions}</div>
        </div>
      </div>

      {/* Create accounts button (only if none exist) */}
      {status.enCount === 0 && status.esCount === 0 && (
        <div className="card mb-6">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Setup Required</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            No seed accounts found. Create the 32 fake accounts (16 EN + 16 ES) to get started.
          </p>
          <button className="btn btn-primary" onClick={handleCreateAccounts} disabled={creating}>
            {creating ? 'Creating...' : 'Create 32 Seed Accounts'}
          </button>
        </div>
      )}

      {/* Today's status + Run button */}
      <div className="card mb-6">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Today&apos;s Seeds</h2>
          <div className="flex gap-2">
            <button
              className="btn btn-success"
              onClick={() => handleRunSeeds('both')}
              disabled={isPending || (status.enCount === 0 && status.esCount === 0)}
            >
              {isPending ? 'Running...' : 'Run All Seeds (EN + ES)'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>English</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{status.todayWordEn || 'No word set'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {status.todaySubmissionsEn} / {status.enCount} submitted
            </div>
            <button
              className="btn btn-outline"
              style={{ marginTop: 8, fontSize: 12, padding: '6px 12px' }}
              onClick={() => handleRunSeeds('en')}
              disabled={isPending || status.enCount === 0}
            >
              {isPending ? '...' : 'Run EN Only'}
            </button>
          </div>
          <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Spanish</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{status.todayWordEs || 'No word set'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {status.todaySubmissionsEs} / {status.esCount} submitted
            </div>
            <button
              className="btn btn-outline"
              style={{ marginTop: 8, fontSize: 12, padding: '6px 12px' }}
              onClick={() => handleRunSeeds('es')}
              disabled={isPending || status.esCount === 0}
            >
              {isPending ? '...' : 'Run ES Only'}
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className="card mb-6"
          style={{
            borderColor: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            background: message.type === 'success' ? '#2ECC7111' : '#ef444411',
          }}
        >
          <p style={{ color: message.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
            {message.text}
          </p>
        </div>
      )}

      {/* Run report details */}
      {runReport && (
        <div className="card mb-6">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Run Report</h3>
          <pre style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(runReport, null, 2)}
          </pre>
        </div>
      )}

      {/* Language toggle + account list */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>
            Seed Accounts ({language === 'en' ? 'English' : 'Spanish'})
          </h2>
          <div className="flex gap-2">
            <button
              className={`btn ${language === 'en' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setLanguage('en')}
              style={{ padding: '6px 16px', fontSize: 13 }}
            >
              English ({status.enCount})
            </button>
            <button
              className={`btn ${language === 'es' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setLanguage('es')}
              style={{ padding: '6px 16px', fontSize: 13 }}
            >
              Spanish ({status.esCount})
            </button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No seed accounts for this language yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Avatar</th>
                <th>Username</th>
                <th>Streak</th>
                <th>Plays</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account: any, i: number) => (
                <tr key={account.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontSize: 20 }}>{account.avatar_url}</td>
                  <td style={{ fontWeight: 600 }}>{account.username}</td>
                  <td>{account.current_streak}</td>
                  <td>{account.total_plays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
