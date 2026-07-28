import { apiSuccess, withErrorHandler } from '@api/server';

import { withTenant } from '@entities/tenant/server';
import { requireAuth } from '@/shared/api/auth-utils';

export const maxDuration = 8;

/**
 * Annual statement download — stub for Phase 1.
 * Returns a placeholder message directing users to the Export Data feature
 * for transaction history. Full PDF statement generation will be available
 * in a future update.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  await withTenant();

  return apiSuccess({
    message:
      'Annual statement generation will be available in a future update. ' +
      'Please use the Export Data feature to download your transaction history.',
  });
});
