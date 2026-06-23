'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const ADMIN_LINKS = [
  { href: '/admin/providers', label: 'Providers' },
  { href: '/admin/providers/revenue', label: 'Revenue' },
  { href: '/admin/providers/analytics', label: 'Analytics' },
  { href: '/admin/providers/transactions', label: 'Transactions' },
  { href: '/admin/providers/settings', label: 'Settings' },
];

export function ProvidersSubNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap gap-3 px-6 py-4">
        {ADMIN_LINKS.map(link => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
