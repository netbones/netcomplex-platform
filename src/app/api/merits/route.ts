import { createId } from '@shared/lib/id';
import {
  apiCreated,
  apiError,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
  auth,
  communityMerits,
  db,
  notDeleted,
  notifications,
  now,
  rateLimitByUser,
  withErrorHandler,
  writeAuditLog,
} from '@api/server';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { BEHAVIOR_POINTS, DEFAULT_EXPIRY_DAYS, getStandingTier } from '@entities/merit';
import {
  getEffectivePoints,
  checkAndEscalateStanding,
  getMeritExpiryDays,
} from '@/entities/merit/services';

export const maxDuration = 8;

/**
 * GET /api/merits — List behavior records (paginated, filterable).
 */
export const GET = withErrorHandler(async (request: Request) => {
  const { tenantId } = await withTenant();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return apiUnauthorized();

  if (!hasPermission((session.user as Record<string, unknown>).role as string, 'users'))
    return apiForbidden('Insufficient permissions');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const filterUserId = searchParams.get('userId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const conditions = [eq(communityMerits.tenantId, tenantId), notDeleted(communityMerits)];

  if (status && ['ACTIVE', 'DISPUTED', 'UPHELD', 'OVERTURNED'].includes(status)) {
    conditions.push(
      eq(communityMerits.status, status as 'ACTIVE' | 'DISPUTED' | 'UPHELD' | 'OVERTURNED')
    );
  }
  if (
    category &&
    [
      'COMMUNITY_SERVICE',
      'VOLUNTEERISM',
      'MAINTENANCE',
      'NOISE',
      'PARKING',
      'SECURITY',
      'PETS',
      'COMPLIANCE',
      'OTHER',
    ].includes(category)
  ) {
    conditions.push(
      eq(
        communityMerits.category,
        category as
          | 'COMMUNITY_SERVICE'
          | 'VOLUNTEERISM'
          | 'MAINTENANCE'
          | 'NOISE'
          | 'PARKING'
          | 'SECURITY'
          | 'PETS'
          | 'COMPLIANCE'
          | 'OTHER'
      )
    );
  }
  if (filterUserId) conditions.push(eq(communityMerits.userId, filterUserId));

  const rows = await db
    .select()
    .from(communityMerits)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(communityMerits.createdAt));

  return apiSuccess(rows, { limit, offset });
});

/**
 * POST /api/merits — Create a new behavior record.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const { tenantId } = await withTenant();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return apiUnauthorized();

  if (!hasPermission((session.user as Record<string, unknown>).role as string, 'users'))
    return apiForbidden('Insufficient permissions');

  const rateLimit = await rateLimitByUser(session.user.id, { windowMs: 60_000, maxRequests: 20 });
  if (rateLimit) return rateLimit;

  const body = await request.json();
  const { userId, behaviorType, category, reason, description } = body;

  if (!userId || !behaviorType || !reason) {
    return apiError(
      'VALIDATION_ERROR',
      'Missing required fields: userId, behaviorType, reason',
      400
    );
  }

  const validTypes = ['MERIT', 'WARNING', 'INFRACTION'] as const;
  if (!validTypes.includes(behaviorType)) {
    return apiError(
      'VALIDATION_ERROR',
      `Invalid behaviorType. Must be one of: ${validTypes.join(', ')}`,
      400
    );
  }

  const id = createId();
  const ts = now();
  let recognitionPoints = 0;
  let disciplinaryPoints = 0;

  if (behaviorType === 'MERIT') {
    recognitionPoints = BEHAVIOR_POINTS.MERIT;
  } else if (behaviorType === 'WARNING') {
    disciplinaryPoints = BEHAVIOR_POINTS.WARNING;
  } else if (behaviorType === 'INFRACTION') {
    disciplinaryPoints = BEHAVIOR_POINTS.INFRACTION;
  }

  const expiryDays = DEFAULT_EXPIRY_DAYS[behaviorType as keyof typeof DEFAULT_EXPIRY_DAYS];
  const configuredMeritExpiryDays =
    behaviorType === 'MERIT' ? await getMeritExpiryDays(tenantId) : null;
  const effectiveExpiryDays = behaviorType === 'MERIT' ? configuredMeritExpiryDays : expiryDays;
  const expiresAt = effectiveExpiryDays
    ? new Date(ts.getTime() + effectiveExpiryDays * 24 * 60 * 60 * 1000)
    : null;

  const { overall: standingBefore } = await getEffectivePoints(userId, tenantId);
  const standingAfter =
    standingBefore + (behaviorType === 'MERIT' ? recognitionPoints : -disciplinaryPoints);

  await db.insert(communityMerits).values({
    id,
    tenantId,
    userId,
    behaviorType: behaviorType as typeof communityMerits.$inferInsert.behaviorType,
    category: category || 'OTHER',
    reason,
    description: description || null,
    recognitionPoints,
    disciplinaryPoints,
    standingBefore,
    standingAfter,
    status: 'ACTIVE',
    createdById: session.user.id,
    createdAt: ts,
    expiresAt,
  });

  await checkAndEscalateStanding(userId, tenantId);

  const tierBefore = getStandingTier(standingBefore);
  const tierAfter = getStandingTier(standingAfter);
  if (tierBefore !== tierAfter) {
    const labels: Record<string, string> = {
      GOLD: 'Gold',
      SILVER: 'Silver',
      BRONZE: 'Bronze',
      WATCHLIST: 'Watchlist',
      PROBATION: 'Probation',
    };
    await db.insert(notifications).values({
      id: createId(),
      tenantId,
      userId,
      title: 'Community standing updated',
      message: `Your standing changed from ${labels[tierBefore]} to ${labels[tierAfter]}.`,
      type: tierAfter === 'WATCHLIST' || tierAfter === 'PROBATION' ? 'warning' : 'info',
      read: false,
    });
  }

  await writeAuditLog({
    tenantId,
    action: 'MERIT_RECORD_CREATED',
    targetId: id,
    actorId: session.user.id,
    details: { behaviorType, recognitionPoints, disciplinaryPoints, standingBefore, standingAfter },
  });

  return apiCreated({ id, standingBefore, standingAfter });
});
