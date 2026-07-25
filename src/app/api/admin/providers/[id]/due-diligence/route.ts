import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import {
  apiError,
  apiUnauthorized,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  db,
  getSessionAndRole,
  guardSuspension,
  notDeleted,
  requireAnyPermission,
  serviceProviders,
  writeAuditLog,
  providerDueDiligenceWorkflows,
  providerDueDiligenceItems,
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
  workflowStatus: z.enum(['PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']).optional(),
  assignedTo: z.string().optional(),
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
    if (!auth) return apiUnauthorized();
    const guard = guardSuspension(auth);
    if (guard) return guard;
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

    const { items, verificationNotes, workflowStatus, assignedTo } = parsed.data;
    const allApproved = items.every(i => i.status === 'APPROVED');
    const newVerificationStatus = allApproved ? 'VERIFIED' : 'PROBATION';
    const notes =
      verificationNotes?.trim() ||
      `Due diligence updated: ${items.filter(i => i.status === 'APPROVED').length}/${items.length} items approved.`;

    // Write to new workflow table
    const [existingWorkflow] = await db
      .select({ id: providerDueDiligenceWorkflows.id })
      .from(providerDueDiligenceWorkflows)
      .where(
        and(
          eq(providerDueDiligenceWorkflows.tenantId, tenantId),
          eq(providerDueDiligenceWorkflows.providerId, provider.id)
        )
      )
      .limit(1);

    if (existingWorkflow) {
      await db
        .update(providerDueDiligenceWorkflows)
        .set({
          status: workflowStatus ?? (allApproved ? 'APPROVED' : 'UNDER_REVIEW'),
          assignedTo: assignedTo ?? undefined,
          notes: verificationNotes ?? undefined,
          completedAt: allApproved ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(providerDueDiligenceWorkflows.id, existingWorkflow.id));

      // Upsert items
      for (const item of items) {
        const [existingItem] = await db
          .select({ id: providerDueDiligenceItems.id })
          .from(providerDueDiligenceItems)
          .where(
            and(
              eq(providerDueDiligenceItems.workflowId, existingWorkflow.id),
              eq(providerDueDiligenceItems.itemKey, item.key)
            )
          )
          .limit(1);

        if (existingItem) {
          await db
            .update(providerDueDiligenceItems)
            .set({
              status: item.status as 'PENDING' | 'APPROVED' | 'REJECTED',
              notes: item.notes ?? undefined,
              reviewedBy: auth.userId,
              reviewedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(providerDueDiligenceItems.id, existingItem.id));
        } else {
          await db.insert(providerDueDiligenceItems).values({
            id: crypto.randomUUID(),
            workflowId: existingWorkflow.id,
            itemKey: item.key,
            status: item.status as 'PENDING' | 'APPROVED' | 'REJECTED',
            notes: item.notes ?? undefined,
            reviewedBy: auth.userId,
            reviewedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    } else {
      const workflowId = crypto.randomUUID();
      await db.insert(providerDueDiligenceWorkflows).values({
        id: workflowId,
        providerId: provider.id,
        tenantId,
        status: workflowStatus ?? (allApproved ? 'APPROVED' : 'UNDER_REVIEW'),
        assignedTo: assignedTo ?? undefined,
        notes: verificationNotes ?? undefined,
        completedAt: allApproved ? new Date() : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      for (const item of items) {
        await db.insert(providerDueDiligenceItems).values({
          id: crypto.randomUUID(),
          workflowId,
          itemKey: item.key,
          status: item.status as 'PENDING' | 'APPROVED' | 'REJECTED',
          notes: item.notes ?? undefined,
          reviewedBy: auth.userId,
          reviewedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Keep writing to old JSON field for backward compat
    await upsertProviderVerification({
      tenantId,
      providerId: provider.id,
      status: newVerificationStatus,
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
          workflowStatus,
        },
      });
    }

    const dueDiligence = await getProviderDueDiligenceSnapshot(
      tenantId,
      provider.id,
      newVerificationStatus
    );

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
