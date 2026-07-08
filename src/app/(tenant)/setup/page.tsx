import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { auth, db, tenants } from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { getTenantSetup } from '@entities/setup/server';
import { ErrorBoundary } from '@shared/ui';
import { SetupCenter } from '@/features/setup';
import type { SetupMission } from '@/entities/setup';

export const dynamic = 'force-dynamic';

interface SetupPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SetupPage({ searchParams: _searchParams }: SetupPageProps) {
  const { tenantId } = await withTenant();

  // Auth gate: the Setup Center is owner-only. Enforce a session here so
  // unauthenticated visitors are redirected to sign-in instead of rendering
  // the page and hitting a 401 on /api/platform/setup. Mirrors the tenant-owner
  // check in the API route (src/app/api/platform/setup/route.ts).
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const [tenant] = await db
    .select({ ownerId: tenants.ownerId })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant || tenant.ownerId !== session.user.id) {
    redirect('/dashboard');
  }

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
            (
              msns as unknown as Array<
                Record<string, unknown> & {
                  createdAt: Date;
                  updatedAt: Date;
                  completedAt: Date | null;
                  deletedAt: Date | null;
                }
              >
            ).map(m => ({
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
