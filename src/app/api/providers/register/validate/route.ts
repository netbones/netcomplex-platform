import {
  apiError,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
  getSessionAndRole,
  withErrorHandler,
  guardSuspension,
} from '@api/server';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { getProviderRegistrationModeImpl } from '@entities/tenant/server';
import { findProviderDuplicateByCompanyName } from '@shared/api';
import { hasPermission } from '@shared/lib';
import { providerRegistrationValidationSchema } from '@shared/lib/providers';

export const maxDuration = 8;

export const POST = withErrorHandler(async (request: Request) => {
  const auth = await getSessionAndRole(request);
  if (!auth) {
    return apiUnauthorized();
  }
  const guard = guardSuspension(auth);
  if (guard) return guard;

  const moduleCheck = await assertModuleEnabled('providers');
  if (moduleCheck) return moduleCheck;

  const canRegister =
    hasPermission(auth.role, 'directory') || hasPermission(auth.role, 'providers');
  if (!canRegister) {
    return apiForbidden('Directory or provider access is required');
  }

  const { tenantId } = await withTenant();
  const registrationMode = await getProviderRegistrationModeImpl(tenantId);

  const body = await request.json();
  const parsed = providerRegistrationValidationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
  }

  const sessionEmail = auth.session.user.email.trim().toLowerCase();
  const requestedEmail = parsed.data.email.trim().toLowerCase();
  const duplicate = await findProviderDuplicateByCompanyName(tenantId, parsed.data.companyName);

  return apiSuccess({
    registrationMode,
    canSubmit: registrationMode === 'OPEN' && !duplicate && requestedEmail === sessionEmail,
    emailMatchesAccount: requestedEmail === sessionEmail,
    companyAvailable: !duplicate,
    duplicateCompanyName: duplicate?.companyName ?? null,
  });
});
