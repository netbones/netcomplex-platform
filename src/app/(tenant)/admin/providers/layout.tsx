import Link from 'next/link';

import { getSessionAndRole } from '@api/server';
import { hasPermission } from '@shared/lib';

const ADMIN_LINKS = [
  { href: '/admin/providers', label: 'Providers' },
  { href: '/admin/providers/revenue', label: 'Revenue' },
  { href: '/admin/providers/analytics', label: 'Analytics' },
  { href: '/admin/providers/transactions', label: 'Transactions' },
  { href: '/admin/providers/settings', label: 'Settings' },
];

export default async function AdminProviderLayout({ children }: { children: React.ReactNode }) {
  const auth = await getSessionAndRole();
  const allowed = auth
    ? hasPermission(auth.role, 'providers') || hasPermission(auth.role, 'settings')
    : false;

  if (!allowed) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Board or admin access is required to manage providers, revenue, and moderation settings.
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-3 px-6 py-4">
          {ADMIN_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
