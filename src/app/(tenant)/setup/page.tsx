import { withTenant } from '@entities/tenant/server';
import { getTenantSetup } from '@/entities/setup';
import { ErrorBoundary } from '@shared/ui';
import { SetupCenter } from '@/features/setup';
import type { SetupMission } from '@/entities/setup';

export const dynamic = 'force-dynamic';

interface SetupPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SetupPage({ searchParams: _searchParams }: SetupPageProps) {
  const { tenantId } = await withTenant();

  // Feature flag gating for enable-setup-center is at the navigation level
  // (permissionKey: 'admin' in ADMIN_ITEMS). The feature is at foundation tier
  // so all tenants have access by default. Page-level auth is enforced by the
  // tenant middleware and withTenant().

  // Fetch initial setup data from DB
  const setup = await getTenantSetup(tenantId);

  // Transform DB types to the shape expected by SetupCenter
  const initialData = setup
    ? {
        id: setup.id,
        tenantId: setup.tenantId,
        completionPercent: setup.completionPercent,
        completedSections: setup.completedSections as string[],
        launchedAt: setup.launchedAt?.toISOString?.() ?? null,
        lastViewedAt: setup.lastViewedAt?.toISOString?.() ?? null,
        createdAt: setup.createdAt.toISOString(),
        updatedAt: setup.updatedAt.toISOString(),
        missions: Object.fromEntries(
          Object.entries(setup.missions).map(([section, msns]) => [
            section,
            (msns as unknown as SetupMission[]).map(m => ({
              ...m,
              createdAt: m.createdAt.toISOString(),
              updatedAt: m.updatedAt.toISOString(),
              completedAt: m.completedAt?.toISOString?.() ?? null,
              deletedAt: m.deletedAt?.toISOString?.() ?? null,
            })),
          ])
        ) as Record<string, SetupMission[]>,
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ErrorBoundary>
        <SetupCenter tenantId={tenantId} initialData={initialData} />
      </ErrorBoundary>
    </div>
  );
}
