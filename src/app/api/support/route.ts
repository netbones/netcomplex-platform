import {
  auth,
  db,
  supports,
  users,
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiValidationError,
  withErrorHandler,
} from '@api/server';

import { and, desc, eq, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { getOrCreateWallet } from '@entities/dwallet/server';
import { z } from 'zod';
import {
  supportTargetSchema,
  createSupportSchema,
  createSupport,
  SupportError,
} from '@features/support/server';

export const maxDuration = 8;

const querySchema = z.object({
  targetType: supportTargetSchema,
  targetId: z.string().min(1),
});

export const GET = withErrorHandler(async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return apiUnauthorized();

  const { tenantId } = await withTenant();
  const viewerUserId = session.user.id;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { targetType, targetId } = parsed.data;

  const [aggregate] = await db
    .select({
      totalChips: sql<number>`COALESCE(SUM(${supports.chips}), 0)::int`,
      supporterCount: sql<number>`COUNT(DISTINCT ${supports.senderUserId})::int`,
    })
    .from(supports)
    .where(
      and(
        eq(supports.tenantId, tenantId),
        eq(supports.targetType, targetType),
        eq(supports.targetId, targetId)
      )
    );

  const [yours] = await db
    .select({
      totalChips: sql<number>`COALESCE(SUM(${supports.chips}), 0)::int`,
    })
    .from(supports)
    .where(
      and(
        eq(supports.tenantId, tenantId),
        eq(supports.targetType, targetType),
        eq(supports.targetId, targetId),
        eq(supports.senderUserId, viewerUserId)
      )
    );

  const yourChips = yours?.totalChips ?? 0;

  // Top supporters (non-anonymous only, by name)
  const topSupporters = await db
    .select({
      name: users.name,
      chips: sql<number>`SUM(${supports.chips})::int`,
      isAnonymous: supports.isAnonymous,
    })
    .from(supports)
    .innerJoin(users, eq(users.id, supports.senderUserId))
    .where(
      and(
        eq(supports.tenantId, tenantId),
        eq(supports.targetType, targetType),
        eq(supports.targetId, targetId),
        eq(supports.isAnonymous, false)
      )
    )
    .groupBy(users.name, supports.isAnonymous)
    .orderBy(desc(sql`SUM(${supports.chips})`))
    .limit(5);

  return apiSuccess({
    totalChips: aggregate?.totalChips ?? 0,
    supporterCount: aggregate?.supporterCount ?? 0,
    hasSupported: yourChips > 0,
    yourChips,
    topSupporters: topSupporters.map(s => ({
      name: s.name,
      chips: s.chips,
      isAnonymous: s.isAnonymous,
    })),
  });
});

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return apiUnauthorized();

  const { tenantId } = await withTenant();
  const senderUserId = session.user.id;

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = createSupportSchema.safeParse(body);
  if (!parsed.success) return apiValidationError(parsed.error.flatten());

  const { targetType, targetId, recipientUserId, chips, message, isAnonymous } =
    parsed.data;

  await getOrCreateWallet(senderUserId, tenantId);

  try {
    const result = await createSupport({
      tenantId,
      senderUserId,
      recipientUserId,
      targetType,
      targetId,
      chips,
      message,
      isAnonymous,
    });

    return apiSuccess({
      supportId: result.supportId,
      senderBalanceAfter: result.senderBalanceAfter,
    });
  } catch (error) {
    if (error instanceof SupportError) {
      return apiError('VALIDATION_ERROR', error.message, 422, { code: error.code });
    }
    throw error;
  }
});
