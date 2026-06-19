import { v4 as uuidv4 } from 'uuid';
import {
  auth,
  db,
  behaviorRecords,
  apiUnauthorized,
  apiForbidden,
  apiCreated,
  apiError,
  writeAuditLog,
} from '@api/server';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import {
  BEHAVIOR_POINTS,
  DEFAULT_EXPIRY_DAYS,
  getEffectivePoints,
  checkAndEscalateStanding,
} from '@entities/merit';

export const maxDuration = 8;

/**
 * GET /api/merits — List behavior records (paginated, filterable).
 */
export async function GET(request: Request) {
  const { tenantId } = await withTenant();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return apiUnauthorized();

  if (!hasPermission(session.user.role, 'users')) return apiForbidden('Insufficient permissions');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const filterUserId = searchParams.get('userId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const conditions = [eq(behaviorRecords.tenantId, tenantId), isNull(behaviorRecords.deletedAt)];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (status) conditions.push(eq(behaviorRecords.status, status as any));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (category) conditions.push(eq(behaviorRecords.category, category as any));
  if (filterUserId) conditions.push(eq(behaviorRecords.userId, filterUserId));

  const rows = await db
    .select()
    .from(behaviorRecords)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(behaviorRecords.createdAt));

  return Response.json({ data: rows, limit, offset });
}

/**
 * POST /api/merits — Create a new behavior record.
 */
export async function POST(request: Request) {
  const { tenantId } = await withTenant();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return apiUnauthorized();

  if (!hasPermission(session.user.role, 'users')) return apiForbidden('Insufficient permissions');

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

  const id = uuidv4();
  const now = new Date();
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
  const expiresAt = expiryDays ? new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000) : null;

  const { overall: standingBefore } = await getEffectivePoints(userId, tenantId);
  const standingAfter =
    standingBefore + (behaviorType === 'MERIT' ? recognitionPoints : -disciplinaryPoints);

  await db.insert(behaviorRecords).values({
    id,
    tenantId,
    userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    behaviorType: behaviorType as any,
    category: category || 'OTHER',
    reason,
    description: description || null,
    recognitionPoints,
    disciplinaryPoints,
    standingBefore,
    standingAfter,
    status: 'ACTIVE',
    createdById: session.user.id,
    createdAt: now,
    expiresAt,
  });

  await checkAndEscalateStanding(userId, tenantId);

  await writeAuditLog({
    tenantId,
    action: 'MERIT_RECORD_CREATED',
    targetId: id,
    actorId: session.user.id,
    details: { behaviorType, recognitionPoints, disciplinaryPoints, standingBefore, standingAfter },
  });

  return apiCreated({ id, standingBefore, standingAfter });
}
