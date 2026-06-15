import {
  auth,
  db,
  questions,
  surveys,
  users,
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, and, inArray } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

export const maxDuration = 8;

async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const user = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return {
    session,
    userId: session.user.id,
    role: user[0]?.role || 'RESIDENT',
  };
}

/**
 * POST /api/surveys/[id]/questions/reorder - Batch update order/sectionId for questions.
 * Body: { items: [{ id: string, order: number, sectionId?: string | null }] }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  if (!hasPermission(authData.role, 'content')) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();
  const { id: surveyId } = await params;

  // Verify survey exists in tenant
  const [survey] = await db
    .select({ id: surveys.id })
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.tenantId, tenantId)))
    .limit(1);

  if (!survey) {
    return apiNotFound('Survey not found');
  }

  const body = await request.json();

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return apiValidationError({ items: 'items must be a non-empty array' });
  }

  // Validate each item shape
  for (const item of body.items) {
    if (!item.id || typeof item.id !== 'string') {
      return apiValidationError({ items: 'each item must have a string id' });
    }
    if (typeof item.order !== 'number') {
      return apiValidationError({ items: 'each item must have a numeric order' });
    }
  }

  const itemIds = body.items.map((item: { id: string }) => item.id);

  // Verify all question IDs belong to this survey + tenant
  const existing = await db
    .select({ id: questions.id })
    .from(questions)
    .where(
      and(
        eq(questions.surveyId, surveyId),
        eq(questions.tenantId, tenantId),
        inArray(questions.id, itemIds)
      )
    );

  if (existing.length !== itemIds.length) {
    return apiNotFound('One or more questions not found in this survey');
  }

  // Batch update in a transaction
  const reordered = await db.transaction(async tx => {
    for (const item of body.items) {
      const updateSet: Record<string, unknown> = { order: item.order };
      // Allow moving questions between sections (or to ungrouped)
      if ('sectionId' in item) {
        updateSet.sectionId = item.sectionId ?? null;
      }
      await tx
        .update(questions)
        .set(updateSet)
        .where(and(eq(questions.id, item.id), eq(questions.tenantId, tenantId)));
    }
    return body.items.length;
  });

  return apiSuccess({ reordered });
}
