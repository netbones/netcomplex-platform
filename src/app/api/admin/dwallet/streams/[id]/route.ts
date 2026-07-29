import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
  withErrorHandler,
  db,
  dataRevenueStreams,
  now,
} from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { createComponentLogger } from '@shared/lib';
import { withTenant } from '@entities/tenant/server';
import { streamUpdateSchema } from '@entities/dwallet';
import { eq, and } from 'drizzle-orm';

export const maxDuration = 8;

const logger = createComponentLogger('admin-dwallet-stream');

/**
 * PATCH /api/admin/dwallet/streams/:id
 *
 * Updates a DataRevenueStream config (label, description, residentSharePct, isActive).
 * Only provided fields are updated (partial update via streamUpdateSchema).
 */
export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(request, { permission: 'admin' });
    if (!auth.success) return auth.response;

    const { id: streamId } = await params;

    try {
      const { tenantId } = await withTenant();
      const body = streamUpdateSchema.parse(await request.json());

      // Query stream with tenant isolation
      const [existing] = await db
        .select()
        .from(dataRevenueStreams)
        .where(and(eq(dataRevenueStreams.id, streamId), eq(dataRevenueStreams.tenantId, tenantId)))
        .limit(1);

      if (!existing) return apiNotFound('Stream not found');

      // Build update set from provided fields only
      const updateSet: Record<string, unknown> = { updatedAt: now() };

      if (body.label !== undefined) updateSet.label = body.label;
      if (body.description !== undefined) updateSet.description = body.description;
      if (body.residentSharePct !== undefined) {
        updateSet.residentSharePct = String(body.residentSharePct);
      }
      if (body.isActive !== undefined) updateSet.isActive = body.isActive;

      const [updated] = await db
        .update(dataRevenueStreams)
        .set(updateSet as never)
        .where(eq(dataRevenueStreams.id, streamId))
        .returning();

      logger.info(
        { event: 'stream_updated', streamId, tenantId, changes: Object.keys(updateSet) },
        'Revenue stream updated'
      );

      return apiSuccess(updated);
    } catch (error) {
      logger.error({ event: 'update_stream_error', streamId }, 'Failed to update stream', error);
      return apiInternalError(String(error));
    }
  }
);
