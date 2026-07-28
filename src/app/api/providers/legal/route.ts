import {
  apiError,
  apiNotFound,
  apiSuccess,
  getSessionAndRole,
  withErrorHandler,
} from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import {
  getProviderLegalAgreementStatus,
  getProviderRecordForUser,
  recordProviderLegalAgreements,
} from '@shared/api';
import { PROVIDER_LEGAL_DOCUMENTS, providerLegalAcceptanceSchema } from '@shared/lib/providers';

export const maxDuration = 8;

/**
 * @deprecated Use trpc.providers.getLegalDocuments instead.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const { tenantId } = await withTenant();
  const moduleCheck = await assertModuleEnabled('providers');
  if (moduleCheck) return moduleCheck;
  const auth = await getSessionAndRole(request);
  const providerRecord = auth
    ? await getProviderRecordForUser(tenantId, auth.session.user.email)
    : null;
  const legalStatus = await getProviderLegalAgreementStatus(tenantId, providerRecord?.id ?? null);

  return apiSuccess({
    providerRecordExists: Boolean(providerRecord),
    documents: legalStatus.documents.length > 0 ? legalStatus.documents : PROVIDER_LEGAL_DOCUMENTS,
    acceptedAgreementCount: legalStatus.acceptedAgreementCount,
    allAccepted: legalStatus.allAccepted,
  });
});

/**
 * @deprecated Use trpc.providers.acceptLegalAgreements instead.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const moduleCheck = await assertModuleEnabled('providers');
  if (moduleCheck) return moduleCheck;

  const { tenantId } = await withTenant();
  const providerRecord = await getProviderRecordForUser(tenantId, auth.data.session.user.email);
  if (!providerRecord) {
    return apiNotFound('Linked provider profile not found');
  }

  const body = await request.json();
  const parsed = providerLegalAcceptanceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
  }

  const legalStatus = await recordProviderLegalAgreements({
    tenantId,
    providerId: providerRecord.id,
    legalAgreements: parsed.data,
    request,
  });

  return apiSuccess(legalStatus);
});
