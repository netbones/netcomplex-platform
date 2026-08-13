import { NextRequest } from 'next/server';
import { apiSuccess, apiError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { resolveCallerPropertyId, createQuickAccessCode } from '@entities/access-control/server';
import { quickAccessCodeSchema } from '@entities/access-control';

export const maxDuration = 8;

const BASE_URL =
  process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('accessControl');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const propertyId = await resolveCallerPropertyId(tenantId, auth.data.userId);
  if (!propertyId) {
    return apiError('PROPERTY_REQUIRED', 'No property linked to your account', 400);
  }

  const body = await request.json();
  const parsed = quickAccessCodeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid quick code payload', 400, parsed.error.flatten());
  }

  const result = await createQuickAccessCode({
    tenantId,
    propertyId,
    userId: auth.data.userId,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    baseUrl: BASE_URL.startsWith('http') ? BASE_URL : `https://${BASE_URL}`,
  });

  return apiSuccess(result, undefined, 201);
});
