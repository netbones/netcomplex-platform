import {
  apiSuccess,
  apiCreated,
  apiConflict,
  apiInternalError,
  withErrorHandler,
  db,
  dataRevenueStreams,
  now,
} from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { createComponentLogger } from '@shared/lib';
import { withTenant } from '@entities/tenant/server';
import { streamConfigSchema } from '@entities/dwallet';
import { eq, and } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

const logger = createComponentLogger('admin-dwallet-streams');

/**
 * GET /api/admin/dwallet/streams
 *
 * Lists all DataRevenueStream config for the tenant (active + inactive).
 */
export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  try {
    const { tenantId } = await withTenant();

    const streams = await db
      .select()
      .from(dataRevenueStreams)
      .where(eq(dataRevenueStreams.tenantId, tenantId));

    return apiSuccess(streams);
  } catch (error) {
    logger.error({ event: 'list_streams_error' }, 'Failed to list streams', error);
    return apiInternalError(String(error));
  }
});

/**
 * POST /api/admin/dwallet/streams
 *
 * Creates a new DataRevenueStream config for the tenant.
 * Enforces uniqueness on (tenantId, key) via pre-insert check.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  try {
    const { tenantId } = await withTenant();
    const body = streamConfigSchema.parse(await request.json());

    // Check for duplicate key within tenant
    const [existing] = await db
      .select()
      .from(dataRevenueStreams)
      .where(and(eq(dataRevenueStreams.tenantId, tenantId), eq(dataRevenueStreams.key, body.key)))
      .limit(1);

    if (existing) {
      return apiConflict('A stream with this key already exists');
    }

    const id = createId();
    const timestamp = now();

    const [stream] = await db
      .insert(dataRevenueStreams)
      .values({
        id,
        tenantId,
        key: body.key,
        label: body.label,
        description: body.description ?? null,
        residentSharePct: String(body.residentSharePct),
        isActive: body.isActive,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning();

    logger.info(
      { event: 'stream_created', streamId: id, key: body.key, tenantId },
      'Revenue stream created'
    );

    return apiCreated(stream);
  } catch (error) {
    logger.error({ event: 'create_stream_error' }, 'Failed to create stream', error);
    return apiInternalError(String(error));
  }
});
