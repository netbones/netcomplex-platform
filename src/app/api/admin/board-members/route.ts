import {
  runWithRLS,
  getRLSContext,
  users,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
  withErrorHandler,
} from '@api/server';

import { eq, or, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const dynamic = 'force-dynamic';

const BOARD_ROLES = ['BOARD', 'ADMIN', 'COMMITTEE'] as const;

export const GET = withErrorHandler(async (request: Request) => {
  const ctx = await getRLSContext(request);
  if (!ctx) return apiUnauthorized();
  if (!['BOARD', 'ADMIN'].includes(ctx.role)) {
    return apiForbidden();
  }

  return runWithRLS(ctx, async tx => {
    const { tenantId } = await withTenant();

    const roleConditions = BOARD_ROLES.map(role => eq(users.role, role));

    const boardMembers = await tx
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), or(...roleConditions)));

    return apiSuccess(boardMembers);
  });
});
