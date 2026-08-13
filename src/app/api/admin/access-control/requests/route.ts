import { NextRequest } from 'next/server';
import { apiSuccess, apiError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { createAccessRequest } from '@entities/access-control/server';
import { z } from 'zod';

export const maxDuration = 8;

const BASE_URL =
  process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';

/** Manual-mode helper: guard/admin simulates an unplanned visitor at the gate. */
const createRequestSchema = z.object({
  propertyId: z.string().uuid(),
  visitorName: z.string().trim().min(1).max(120),
  visitorPhotoUrl: z.string().url().optional().nullable(),
  roleLabel: z.string().trim().max(80).optional().nullable(),
  vehicleReg: z.string().trim().max(32).optional().nullable(),
  gateId: z.string().uuid().optional().nullable(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('accessControl');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const body = await request.json();
  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid access request', 400, parsed.error.flatten());
  }

  const item = await createAccessRequest({
    tenantId,
    propertyId: parsed.data.propertyId,
    visitorName: parsed.data.visitorName,
    visitorPhotoUrl: parsed.data.visitorPhotoUrl,
    roleLabel: parsed.data.roleLabel,
    vehicleReg: parsed.data.vehicleReg,
    gateId: parsed.data.gateId,
    baseUrl: BASE_URL.startsWith('http') ? BASE_URL : `https://${BASE_URL}`,
  });

  return apiSuccess({ request: item }, undefined, 201);
});
