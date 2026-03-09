'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/words', label: 'Words' },
  { href: '/users', label: 'Users' },
  { href: '/moderation', label: 'Moderation' },
  { href: '/seed-accounts', label: 'Seed Accounts' },
  { href: '/subscribers', label: 'Subscribers' },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <span className="nav-brand">OneWord Admin</span>
      <div className="nav-links">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${pathname === link.href ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
