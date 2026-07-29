import { revalidatePath, revalidateTag } from 'next/cache';

import {
  apiError,
  apiForbidden,
  apiInternalError,
  apiSuccess,
  CACHE_TAGS,
  writeAuditLog,
  rateLimitByUser,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import {
  getProviderRegistrationModeImpl,
  setProviderRegistrationMode,
} from '@entities/tenant/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { providerRegistrationModeSchema } from '@shared/lib/providers';

export const maxDuration = 8;

function canManageMode(role: string): boolean {
  return role === 'ADMIN' || role === 'BOARD';
}

export async function GET(request: Request) {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  if (!canManageMode(auth.data.role)) {
    return apiForbidden('Board or admin access required');
  }

  const { tenantId } = await withTenant();
  const mode = await getProviderRegistrationModeImpl(tenantId);

  return apiSuccess({
    mode,
    paymentSettingsUnlocked: mode === 'OPEN',
    gatewayStatus: {
      paystackConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY?.trim()),
      paypalConfigured: Boolean(
        process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim()
      ),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  if (!canManageMode(auth.data.role)) {
    return apiForbidden('Board or admin access required');
  }

  const rateLimit = await rateLimitByUser(auth.data.userId, { windowMs: 60_000, maxRequests: 10 });
  if (rateLimit) return rateLimit;

  const body = (await request.json()) as { mode?: string };
  const { tenantId } = await withTenant();
  const previousMode = await getProviderRegistrationModeImpl(tenantId);
  const parsed = providerRegistrationModeSchema.safeParse(body.mode);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'mode must be OPEN or INVITATION_ONLY', 400);
  }

  const ok = await setProviderRegistrationMode(tenantId, parsed.data);
  if (!ok) {
    return apiInternalError('Failed to update provider registration mode');
  }

  revalidateTag(CACHE_TAGS.SETTINGS);
  revalidatePath('/providers/register');

  writeAuditLog({
    action: 'PROVIDER_REGISTRATION_MODE_CHANGED',
    actorId: auth.data.userId,
    tenantId,
    details: { oldValue: previousMode, newValue: parsed.data },
  });

  return apiSuccess({
    mode: parsed.data,
    paymentSettingsUnlocked: parsed.data === 'OPEN',
    gatewayStatus: {
      paystackConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY?.trim()),
      paypalConfigured: Boolean(
        process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim()
      ),
    },
  });
}
