import './globals.css';
import type { Metadata } from 'next';
import { isAuthenticated } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NavBar } from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'OneWord Admin',
  description: 'Admin panel for OneWord game',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
