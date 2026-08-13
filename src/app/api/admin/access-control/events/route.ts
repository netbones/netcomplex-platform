import { NextRequest } from 'next/server';
import { apiSuccess, apiError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { listAccessEvents, createManualAccessEvent } from '@entities/access-control/server';
import { accessEventsQuerySchema, manualAccessEventSchema } from '@entities/access-control';

export const maxDuration = 8;

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('accessControl');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = accessEventsQuerySchema.safeParse(params);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query', 400, parsed.error.flatten());
  }

  const result = await listAccessEvents({
    tenantId,
    q: parsed.data.q,
    state: parsed.data.state,
    method: parsed.data.method,
    range: parsed.data.range ?? 'today',
  });

  return apiSuccess(result);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('accessControl');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const body = await request.json();
  const parsed = manualAccessEventSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid manual entry', 400, parsed.error.flatten());
  }

  const event = await createManualAccessEvent({
    tenantId,
    userId: auth.data.userId,
    actorType: 'MANAGER',
    input: parsed.data,
  });

  return apiSuccess({ event }, undefined, 201);
});
