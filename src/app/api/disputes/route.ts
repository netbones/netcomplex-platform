import {
  apiCreated,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  db,
  disputeCases,
  disputeEvents,
  notDeleted,
  users,
  getSessionAndRole,
  guardSuspension,
} from '@api/server';

import { hasPermission, apiLogger } from '@shared/lib';
import { getTableColumns } from 'drizzle-orm';
import { disputeCreateSchema } from '@entities/dispute';
import { generateDisputeReference } from '@entities/dispute/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { ALL_DISPUTE_CATEGORIES, ALL_DISPUTE_STATUSES } from '@entities/dispute';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

/**
 * Retrieves session and role from the request.
 */
/**
 * GET /api/disputes - List disputes scoped to the authenticated user.
 * @query status - Filter by dispute status
 * @query category - Filter by dispute category
 * @query page - Page number (1-based, default 1)
 * @query limit - Items per page (default 20)
 * @deprecated Use trpc.disputes.listDisputes instead.
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }
  const guard = guardSuspension(authData);
  if (guard) return guard;
  const featureCheck = await assertModuleEnabled('disputes');
  if (featureCheck) return featureCheck;

  const canViewAll = hasPermission(authData.role, 'admin');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  const { tenantId } = await withTenant();

  // Build filters
  const filters: ReturnType<typeof and>[] = [
    eq(disputeCases.tenantId, tenantId),
    notDeleted(disputeCases),
  ];

  // Role-based scoping: residents see only their own disputes
  if (!canViewAll && authData.role !== 'BOARD' && authData.role !== 'COMMITTEE') {
    filters.push(eq(disputeCases.complainantId, authData.userId));
  }

  if (status && ALL_DISPUTE_STATUSES.includes(status as (typeof ALL_DISPUTE_STATUSES)[number])) {
    filters.push(
      eq(disputeCases.status, status as (typeof disputeCases.status.enumValues)[number])
    );
  }

  if (
    category &&
    ALL_DISPUTE_CATEGORIES.includes(category as (typeof ALL_DISPUTE_CATEGORIES)[number])
  ) {
    filters.push(
      eq(disputeCases.category, category as (typeof disputeCases.category.enumValues)[number])
    );
  }

  const rows = await db
    .select({
      ...getTableColumns(disputeCases),
      complainantName: sql`${users.name}`.as('complainantName'),
    })
    .from(disputeCases)
    .leftJoin(users, eq(disputeCases.complainantId, users.id))
    .where(and(...filters))
    .orderBy(desc(disputeCases.createdAt))
    .limit(limit)
    .offset(offset);

  const disputes = rows.map(r => ({
    ...r,
    complainantName: r.complainantName ?? undefined,
  }));

  return apiSuccess(disputes);
}

/**
 * POST /api/disputes - Create a new DRAFT dispute with cooling-off timer.
 * @body category - Dispute category (NOISE, PETS, etc.)
 * @body title - Short title (5-200 chars)
 * @body description - Detailed description (10-5000 chars)
 * @body respondentId - Optional respondent user UUID
 * @body respondentType - Optional respondent type (default: RESIDENT)
 * @body desiredOutcome - Optional desired outcome
 * @body severity - Optional severity level (default: MODERATE)
 * @deprecated Use trpc.disputes.createDispute instead.
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }
  const guard = guardSuspension(authData);
  if (guard) return guard;
  const featureCheck = await assertModuleEnabled('disputes');
  if (featureCheck) return featureCheck;

  try {
    const body = await request.json();

    const validationResult = disputeCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return apiValidationError(validationResult.error.issues);
    }

    const { category, title, description, respondentId, respondentType, desiredOutcome, severity } =
      validationResult.data;

    const { tenantId } = await withTenant();

    const id = createId();
    const referenceNumber = await generateDisputeReference(tenantId);
    const coolingOffEndsAt = new Date(Date.now() + 24 * 3600_000); // 24h default

    const [dispute] = await db
      .insert(disputeCases)
      .values({
        id,
        tenantId,
        referenceNumber,
        complainantId: authData.userId,
        respondentId: respondentId ?? null,
        respondentType: respondentType ?? 'RESIDENT',
        category,
        title,
        description,
        desiredOutcome: desiredOutcome ?? null,
        severity: severity ?? 'MODERATE',
        status: 'DRAFT',
        isConfidential: true,
        coolingOffEndsAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Log CREATED event
    await db.insert(disputeEvents).values({
      id: createId(),
      tenantId,
      disputeId: id,
      actorId: authData.userId,
      eventType: 'CREATED',
      fromStatus: null,
      toStatus: 'DRAFT',
      createdAt: new Date(),
    });

    return apiCreated(dispute);
  } catch (error) {
    apiLogger.error({ err: error, path: '/api/disputes' }, 'Dispute creation error');
    return apiInternalError();
  }
}
