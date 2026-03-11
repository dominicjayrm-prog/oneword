import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
  isAuthenticated,
  setAuthenticated,
  checkRateLimit,
  recordLoginAttempt,
  clearLoginAttempts,
  generateCsrfToken,
  validateCsrfToken,
} from '@/lib/auth';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAuthenticated()) redirect('/');
  const params = await searchParams;
  const csrfToken = await generateCsrfToken();

  async function login(formData: FormData) {
    'use server';
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown';

    // CSRF check
    const csrf = formData.get('csrf_token') as string;
    if (!(await validateCsrfToken(csrf))) {
      redirect('/login?error=csrf');
    }

    // Rate limit check
    const { allowed, remainingMs } = checkRateLimit(ip);
    if (!allowed) {
      const mins = Math.ceil(remainingMs / 60_000);
      redirect(`/login?error=ratelimit&mins=${mins}`);
    }

    const password = formData.get('password') as string;
    if (password === process.env.ADMIN_PASSWORD) {
      clearLoginAttempts(ip);
      await setAuthenticated();
      redirect('/');
    } else {
      recordLoginAttempt(ip);
      redirect('/login?error=wrong');
    }
  }

  const errorMessages: Record<string, string> = {
    wrong: 'Wrong password',
    csrf: 'Invalid request. Please try again.',
    ratelimit: 'Too many login attempts. Please wait before trying again.',
  };

  const errorMessage = params.error ? (errorMessages[params.error] || 'An error occurred') : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 400 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>OneWord Admin</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Enter your admin password to continue</p>
        {errorMessage && (
          <div style={{ background: '#ef444422', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {errorMessage}
          </div>
        )}
        <form action={login}>
          <input type="hidden" name="csrf_token" value={csrfToken} />
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" placeholder="Admin password" autoFocus required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
