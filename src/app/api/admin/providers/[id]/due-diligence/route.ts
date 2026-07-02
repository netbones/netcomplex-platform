import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import {
  apiError,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  db,
  getSessionAndRole,
  notDeleted,
  requireAnyPermission,
  serviceProviders,
  writeAuditLog,
} from '@api/server';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { getProviderDueDiligenceSnapshot, upsertProviderVerification } from '@shared/api';
import { logError } from '@shared/lib';

const dueDiligenceItemSchema = z.object({
  key: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  notes: z.string().optional(),
});

const dueDiligenceSaveSchema = z.object({
  items: z.array(dueDiligenceItemSchema),
  verificationNotes: z.string().optional(),
});

export const maxDuration = 8;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const moduleCheck = await assertModuleEnabled('providers');
    if (moduleCheck) return moduleCheck;

    const authError = await requireAnyPermission(['providers']);
    if (authError) {
      return authError;
    }

    const auth = await getSessionAndRole(request);
    const parsed = dueDiligenceSaveSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
    }

    const { tenantId } = await withTenant();
    const { id } = await params;
    const [provider] = await db
      .select({ id: serviceProviders.id, companyName: serviceProviders.companyName })
      .from(serviceProviders)
      .where(
        and(
          eq(serviceProviders.tenantId, tenantId),
          eq(serviceProviders.id, id),
          notDeleted(serviceProviders)
        )
      )
      .limit(1);

    if (!provider) {
      return apiNotFound('Provider not found');
    }

    const { items, verificationNotes } = parsed.data;
    const allApproved = items.every(i => i.status === 'APPROVED');
    const newStatus = allApproved ? 'VERIFIED' : 'PROBATION';
    const notes =
      verificationNotes?.trim() ||
      `Due diligence updated: ${items.filter(i => i.status === 'APPROVED').length}/${items.length} items approved.`;

    await upsertProviderVerification({
      tenantId,
      providerId: provider.id,
      status: newStatus,
      notes,
      dueDiligenceItems: items.map(i => ({ key: i.key, status: i.status, notes: i.notes })),
    });

    if (auth) {
      writeAuditLog({
        action: 'PROVIDER_DUE_DILIGENCE_UPDATED',
        actorId: auth.userId,
        tenantId,
        targetId: provider.id,
        details: {
          items,
          allApproved,
        },
      });
    }

    const dueDiligence = await getProviderDueDiligenceSnapshot(tenantId, provider.id, newStatus);

    return apiSuccess({ dueDiligence });
  } catch (error) {
    logError(
      { component: 'admin-provider-due-diligence-api', operation: 'PATCH' },
      'Admin provider due diligence update error',
      error
    );
    return apiInternalError();
  }
}
