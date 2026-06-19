import {
  apiSuccess,
  apiInternalError,
  apiUnauthorized,
  requireAnyPermission,
  getRLSContext,
  runWithRLS,
  users,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { count, eq } from 'drizzle-orm';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 5;

const log = createComponentLogger('system-health-api');

export async function GET(request: Request) {
  try {
    const authError = await requireAnyPermission(['admin', 'settings']);
    if (authError) return authError;

    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    return runWithRLS(ctx, async tx => {
      const { tenantId } = await withTenant();

      const [userResult] = await tx
        .select({ count: count() })
        .from(users)
        .where(eq(users.tenantId, tenantId));

      return apiSuccess({
        db: 'connected' as const,
        tenantId,
        tenantName: tenantId,
        userCount: userResult?.count ?? 0,
      });
    });
  } catch (error) {
    log.error({}, 'Health check failed', error);
    return apiInternalError(String(error));
  }
}
