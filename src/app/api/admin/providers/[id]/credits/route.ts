import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import {
  apiError,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  db,
  now,
  providerCredits,
  providerMerits,
  requireAnyPermission,
  serviceProviders,
  writeAuditLog,
  getSessionAndRole,
} from '@api/server';
import { withTenant } from '@entities/tenant/server';
import { getProviderCreditSnapshot, upsertProviderVerification } from '@shared/api';
import { logError } from '@shared/lib';

export const maxDuration = 8;

const providerCreditAdjustmentSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
  totalCredits: z.number().int().min(0).max(10000).optional(),
  creditDelta: z.number().int().min(-1000).max(1000).optional(),
  verificationStatus: z.enum(['PROBATION', 'VERIFIED', 'SUSPENDED']).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAnyPermission(['providers']);
    if (authError) {
      return authError;
    }

    const auth = await getSessionAndRole(request);
    const parsed = providerCreditAdjustmentSchema.safeParse(await request.json());
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
          isNull(serviceProviders.deletedAt)
        )
      )
      .limit(1);

    if (!provider) {
      return apiNotFound('Provider not found');
    }

    const [existing] = await db
      .select()
      .from(providerCredits)
      .where(and(eq(providerCredits.tenantId, tenantId), eq(providerCredits.providerId, provider.id)))
      .limit(1);

    const baseCredits = existing?.totalCredits ?? 0;
    const nextTotalCredits =
      typeof parsed.data.totalCredits === 'number'
        ? parsed.data.totalCredits
        : Math.max(0, baseCredits + (parsed.data.creditDelta ?? 0));

    const timestamp = now();

    if (existing) {
      await db
        .update(providerCredits)
        .set({
          totalCredits: nextTotalCredits,
          lastCalculatedAt: timestamp,
          updatedAt: timestamp,
        })
        .where(eq(providerCredits.id, existing.id));
    } else {
      await db.insert(providerCredits).values({
        id: crypto.randomUUID(),
        tenantId,
        providerId: provider.id,
        totalCredits: nextTotalCredits,
        responseTimeScore: 0,
        qualityScore: 0,
        reviewScore: 0,
        complianceScore: 0,
        engagementScore: 0,
        lastCalculatedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    const delta = nextTotalCredits - baseCredits;
    if (delta !== 0) {
      await db.insert(providerMerits).values({
        id: crypto.randomUUID(),
        tenantId,
        providerId: provider.id,
        meritType: 'REFERENCE',
        points: delta,
        description: `Manual credit adjustment: ${parsed.data.reason}`,
        referenceId: auth?.userId ?? null,
        createdAt: timestamp,
      });
    }

    let verification = null;
    if (parsed.data.verificationStatus) {
      verification = await upsertProviderVerification({
        tenantId,
        providerId: provider.id,
        status: parsed.data.verificationStatus,
        notes: `Manual verification override: ${parsed.data.reason}`,
        endDate: parsed.data.verificationStatus === 'SUSPENDED' ? timestamp : null,
      });
    }

    if (auth) {
      writeAuditLog({
        action: 'PROVIDER_CREDITS_ADJUSTED',
        actorId: auth.userId,
        tenantId,
        targetId: provider.id,
        details: {
          reason: parsed.data.reason,
          baseCredits,
          nextTotalCredits,
          delta,
          verificationStatus: parsed.data.verificationStatus ?? null,
        },
      });
    }

    const snapshot = await getProviderCreditSnapshot(tenantId, provider.id);

    return apiSuccess({ provider, credits: snapshot, verification });
  } catch (error) {
    logError(
      { component: 'admin-provider-credits-api', operation: 'PATCH' },
      'Admin provider credit adjustment error',
      error
    );
    return apiInternalError();
  }
}
