import {
  db,
  dataConsents,
  dataRevenueStreams,
  apiSuccess,
  apiError,
  apiUnauthorized,
  withErrorHandler,
  getSessionAndRole,
  now,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { getOrCreateWallet } from '@entities/dwallet';
import { consentSchema } from '@entities/dwallet';
import { createComponentLogger } from '@shared/lib';

const logger = createComponentLogger('dwalet-consent');

export const maxDuration = 8;

export const POST = withErrorHandler(
  async (request: Request, { params }: { params: { streamKey: string } }) => {
    const sessionData = await getSessionAndRole(request);
    if (!sessionData) return apiUnauthorized();

    const { tenantId } = await withTenant();
    const { streamKey } = params as { streamKey: string };

    // Parse and validate body with Zod
    const body = consentSchema.parse(await request.json());

    // Get or create the resident's wallet
    const wallet = await getOrCreateWallet(sessionData.userId, tenantId);

    // Validate that the stream exists and is active
    const [stream] = await db
      .select()
      .from(dataRevenueStreams)
      .where(
        and(
          eq(dataRevenueStreams.tenantId, tenantId),
          eq(dataRevenueStreams.key, streamKey),
          eq(dataRevenueStreams.isActive, true)
        )
      );

    if (!stream) {
      return apiError('NOT_FOUND', `Revenue stream '${streamKey}' not found or inactive`, 404);
    }

    const timestamp = now();
    const consentId = crypto.randomUUID();

    // INSERT new DataConsent row (append-only — never UPDATE)
    await db.insert(dataConsents).values({
      id: consentId,
      tenantId,
      walletId: wallet.id,
      userId: sessionData.userId,
      streamKey,
      granted: body.granted,
      ipAddress: request.headers.get('x-forwarded-for') ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
      grantedAt: body.granted ? timestamp : null,
      revokedAt: body.granted ? null : timestamp,
      createdAt: timestamp,
    });

    // Pino audit log (mandatory per Constraint 6)
    logger.info({
      event: 'consent_change',
      userId: sessionData.userId,
      streamKey,
      granted: body.granted,
      tenantId,
      ip: request.headers.get('x-forwarded-for'),
    });

    return apiSuccess({ streamKey, granted: body.granted });
  }
);
