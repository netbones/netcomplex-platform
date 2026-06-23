import { getSessionAndRole } from '@api/server';
import { hasPermission } from '@shared/lib';
import { ProvidersSubNav } from './sub-nav';

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
      <ProvidersSubNav />
      {children}
    </div>
  );
}
