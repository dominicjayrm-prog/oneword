import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { NavBar } from '@/components/NavBar';
import { SubscribersClient } from './SubscribersClient';
import { getSubscriberStats, getSubscribers, getChartData } from './actions';

export const dynamic = 'force-dynamic';

export default async function SubscribersPage() {
  if (!(await isAuthenticated())) redirect('/login');

  const [stats, { data: subscribers, count }, chartData] = await Promise.all([
    getSubscriberStats(),
    getSubscribers({
      page: 1,
      pageSize: 25,
      sortBy: 'subscribed_at',
      sortOrder: 'desc',
    }),
    getChartData(),
  ]);

  return (
    <>
      <NavBar />
      <div className="container">
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Subscribers</h1>
        <SubscribersClient
          initialStats={stats}
          initialSubscribers={subscribers}
          initialCount={count}
          initialChartData={chartData}
        />
      </div>
    </>
  );
}
