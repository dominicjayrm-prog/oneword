import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { NavBar } from '@/components/NavBar';
import { SeedAccountsClient } from './client';
import { getSeedStatus } from './actions';

export const dynamic = 'force-dynamic';

export default async function SeedAccountsPage() {
  if (!(await isAuthenticated())) redirect('/login');

  const status = await getSeedStatus();

  return (
    <>
      <NavBar />
      <div className="container">
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Seed Accounts</h1>
        <SeedAccountsClient initialStatus={status} />
      </div>
    </>
  );
}
