import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import {
  apiError,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  db,
  getSessionAndRole,
  notDeleted,
  now,
  providerMerits,
  providerReputations,
  requireAnyPermission,
  serviceProviders,
  writeAuditLog,
} from '@api/server';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { getProviderReputationSnapshot } from '@shared/api';
import { logError } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

const providerReputationAdjustmentSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
  totalScore: z.number().int().min(0).max(10000).optional(),
  reputationDelta: z.number().int().min(-1000).max(1000).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const moduleCheck = await assertModuleEnabled('providers');
    if (moduleCheck) return moduleCheck;

    const authError = await requireAnyPermission(['providers']);
    if (authError) {
      return authError;
    }

    const auth = await getSessionAndRole(request);
    const parsed = providerReputationAdjustmentSchema.safeParse(await request.json());
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

    const [existing] = await db
      .select()
      .from(providerReputations)
      .where(
        and(
          eq(providerReputations.tenantId, tenantId),
          eq(providerReputations.providerId, provider.id)
        )
      )
      .limit(1);

    const baseScore = existing?.totalScore ?? 0;
    const nextTotalScore =
      typeof parsed.data.totalScore === 'number'
        ? parsed.data.totalScore
        : Math.max(0, baseScore + (parsed.data.reputationDelta ?? 0));

    const timestamp = now();

    if (existing) {
      await db
        .update(providerReputations)
        .set({
          totalScore: nextTotalScore,
          lastCalculatedAt: timestamp,
          updatedAt: timestamp,
        })
        .where(eq(providerReputations.id, existing.id));
    } else {
      await db.insert(providerReputations).values({
        id: createId(),
        tenantId,
        providerId: provider.id,
        totalScore: nextTotalScore,
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

    const delta = nextTotalScore - baseScore;
    if (delta !== 0) {
      await db.insert(providerMerits).values({
        id: createId(),
        tenantId,
        providerId: provider.id,
        meritType: 'REFERENCE',
        points: delta,
        description: `Manual reputation adjustment: ${parsed.data.reason}`,
        referenceId: auth?.userId ?? null,
        createdAt: timestamp,
      });
    }

    if (auth) {
      writeAuditLog({
        action: 'PROVIDER_REPUTATION_ADJUSTED',
        actorId: auth.userId,
        tenantId,
        targetId: provider.id,
        details: {
          reason: parsed.data.reason,
          baseScore,
          nextTotalScore,
          delta,
        },
      });
    }

    const snapshot = await getProviderReputationSnapshot(tenantId, provider.id);

    return apiSuccess({ provider, reputation: snapshot });
  } catch (error) {
    logError(
      { component: 'admin-provider-reputation-api', operation: 'PATCH' },
      'Admin provider reputation adjustment error',
      error
    );
    return apiInternalError();
  }
}
