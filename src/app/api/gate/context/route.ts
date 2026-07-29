import { apiSuccess } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant } from '@entities/tenant/server';
import { isModuleEnabled } from '@entities/tenant/server';
import { db, platformModules } from '@api/server';

export const maxDuration = 8;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const { tenantId } = await withTenant();

  const allModules = await db.select({ key: platformModules.key }).from(platformModules);

  const modules: Record<string, boolean> = {};
  for (const { key } of allModules) {
    modules[key] = await isModuleEnabled(tenantId, key);
  }

  return apiSuccess({ modules }, undefined, 200, {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
    },
  });
}
