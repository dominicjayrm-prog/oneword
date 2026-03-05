import { redirect } from 'next/navigation';
import { isAuthenticated, setAuthenticated } from '@/lib/auth';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAuthenticated()) redirect('/');
  const params = await searchParams;

  async function login(formData: FormData) {
    'use server';
    const password = formData.get('password') as string;
    if (password === process.env.ADMIN_PASSWORD) {
      await setAuthenticated();
      redirect('/');
    } else {
      redirect('/login?error=wrong');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 400 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>OneWord Admin</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Enter your admin password to continue</p>
        {params.error && (
          <div style={{ background: '#ef444422', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            Wrong password
          </div>
        )}
        <form action={login}>
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
