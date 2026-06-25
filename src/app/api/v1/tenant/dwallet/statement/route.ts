import { apiSuccess, apiUnauthorized, withErrorHandler, getSessionAndRole } from '@api/server';

import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

/**
 * Annual statement download — stub for Phase 1.
 * Returns a placeholder message directing users to the Export Data feature
 * for transaction history. Full PDF statement generation will be available
 * in a future update.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const sessionData = await getSessionAndRole(request);
  if (!sessionData) return apiUnauthorized();

  await withTenant();

  return apiSuccess({
    message:
      'Annual statement generation will be available in a future update. ' +
      'Please use the Export Data feature to download your transaction history.',
  });
});
