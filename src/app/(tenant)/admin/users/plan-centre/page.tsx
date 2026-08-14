import { getSessionAndRole } from '@api/server';
import { hasPermission } from '@shared/lib';
import { Breadcrumbs } from '@shared/ui';
import { DomainIconBadge } from '@widgets/dashboard';
import { UsersSubNav } from '../users-sub-nav';
import { PlanSeatsSection } from '@widgets/admin';

export default async function PlanCentrePage() {
  const auth = await getSessionAndRole();
  const canManageBilling = auth ? hasPermission(auth.role, 'manageBilling') : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Admin', href: '/admin' },
            { label: 'Users', href: '/admin/users' },
            { label: 'Plan & seats' },
          ]}
        />

        <div className="flex items-center justify-between mt-6 mb-6">
          <div className="flex items-center gap-3">
            <DomainIconBadge id="users" variant="admin" size="md" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Plan &amp; seats</h1>
              <p className="text-sm text-gray-500">
                Seat allocation and billing — manage complimentary grants
              </p>
            </div>
          </div>
        </div>

        <UsersSubNav />

        <div className="mt-6">
          {canManageBilling ? (
            <PlanSeatsSection canManageBilling={canManageBilling} />
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              Billing permissions are required to manage seats and plans.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
