import {
  apiConflict,
  apiCreated,
  apiError,
  apiForbidden,
  apiUnauthorized,
  db,
  getSessionAndRole,
  now,
  serviceProviders,
  withErrorHandler,
} from '@api/server';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import {
  getProviderRecordForUser,
  upsertProviderVerification,
  type ProviderVerificationStatus,
} from '@shared/api';
import {
  createDueDiligenceRegistrationNote,
  providerRegistrationSchema,
} from '@shared/lib/providers/registration';
import {
  findProviderDuplicateByCompanyName,
  getProviderDueDiligenceSnapshot,
  recordProviderLegalAgreements,
} from '@shared/api';
import { getProviderRegistrationModeImpl } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';

export const maxDuration = 8;
export const dynamic = 'force-dynamic';

export const POST = withErrorHandler(async (request: Request) => {
  const auth = await getSessionAndRole(request);
  if (!auth) {
    return apiUnauthorized();
  }

  const moduleCheck = await assertModuleEnabled('providers');
  if (moduleCheck) return moduleCheck;

  const canRegister =
    hasPermission(auth.role, 'directory') || hasPermission(auth.role, 'providers');
  if (!canRegister) {
    return apiForbidden('Directory or provider access is required');
  }

  const { tenantId } = await withTenant();
  const registrationMode = await getProviderRegistrationModeImpl(tenantId);
  if (registrationMode !== 'OPEN') {
    return apiForbidden('Provider registration is invitation-only for this tenant');
  }

  const body = await request.json();
  const parsed = providerRegistrationSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
  }

  const input = parsed.data;
  const sessionEmail = auth.session.user.email.trim().toLowerCase();
  if (input.email.trim().toLowerCase() !== sessionEmail) {
    return apiError(
      'VALIDATION_ERROR',
      'Registration email must match your signed-in account email',
      400
    );
  }

  const existingLinkedProvider = await getProviderRecordForUser(tenantId, auth.session.user.email);
  if (existingLinkedProvider) {
    return apiConflict('A provider profile is already linked to this account');
  }

  const duplicate = await findProviderDuplicateByCompanyName(tenantId, input.companyName);
  if (duplicate) {
    return apiConflict('Company already registered');
  }

  const timestamp = now();
  const providerId = crypto.randomUUID();

  const [provider] = await db
    .insert(serviceProviders)
    .values({
      id: providerId,
      tenantId,
      userId: auth.userId, // ADVISORY-015 Phase 3B: link provider to user record
      companyName: input.companyName,
      contactName: input.contactName,
      phone: input.phone ?? null,
      email: input.email,
      trade: input.trade ?? 'GENERAL',
      website: input.website ?? null,
      isActive: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .returning();

  const verificationStatus: ProviderVerificationStatus = 'PROBATION';
  const verification = await upsertProviderVerification({
    tenantId,
    providerId,
    status: verificationStatus,
    notes: createDueDiligenceRegistrationNote(input.website),
    startDate: timestamp,
    verificationThreshold: 300,
    probationThreshold: 0,
  });

  const legalStatus = await recordProviderLegalAgreements({
    tenantId,
    providerId,
    legalAgreements: input.legalAgreements,
    request,
  });

  const dueDiligence = await getProviderDueDiligenceSnapshot(
    tenantId,
    providerId,
    verificationStatus
  );

  return apiCreated({
    provider,
    verification,
    legalStatus,
    dueDiligence,
    registrationMode,
    website: input.website ?? null,
  });
});
