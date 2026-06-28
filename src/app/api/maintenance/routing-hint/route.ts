import { NextRequest } from 'next/server';
import { getSessionAndRole, apiSuccess, apiError } from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { resolveRoutingType } from '@entities/maintenance/server';

export const maxDuration = 5;

/**
 * GET /api/maintenance/routing-hint
 * Returns the routing type (HOA or LANDLORD) for a given property.
 * Lightweight — no PII, no financials. Read-only, session required.
 */
export async function GET(request: NextRequest) {
  const { tenantId } = await withTenant();
  const authData = await getSessionAndRole(request);
  if (!authData) return apiError('UNAUTHORIZED', 'Authentication required', 401);

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('propertyId');
  if (!propertyId) return apiError('VALIDATION_ERROR', 'propertyId required', 400);

  const { routingType } = await resolveRoutingType(propertyId, tenantId);
  return apiSuccess({ routingType });
}
