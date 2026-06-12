import {
  auth,
  db,
  surveySections,
  users,
  apiError,
  apiForbidden,
  apiNoContent,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
} from '@api/server';

import { hasPermission } from '@entities/tenant';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';

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
 * PATCH /api/surveys/[id]/sections/[sectionId] - Update section fields.
 * Accepts partial body: title, description, image.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  if (!hasPermission(authData.role, 'content')) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();
  const { id: surveyId, sectionId } = await params;

  // Verify section exists and belongs to this survey + tenant
  const [existing] = await db
    .select()
    .from(surveySections)
    .where(
      and(
        eq(surveySections.id, sectionId),
        eq(surveySections.surveyId, surveyId),
        eq(surveySections.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!existing) {
    return apiNotFound('Section not found');
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.image !== undefined) updateData.image = body.image;

  const [updated] = await db
    .update(surveySections)
    .set(updateData)
    .where(
      and(
        eq(surveySections.id, sectionId),
        eq(surveySections.surveyId, surveyId),
        eq(surveySections.tenantId, tenantId)
      )
    )
    .returning();

  if (!updated) {
    return apiError('INTERNAL_ERROR', 'Failed to update section', 500);
  }

  return apiSuccess(updated);
}

/**
 * DELETE /api/surveys/[id]/sections/[sectionId] - Delete a section.
 * Questions that reference this section have their sectionId nullified via the
 * Question.sectionId SetNull cascade defined in the Prisma schema.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  if (!hasPermission(authData.role, 'content')) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();
  const { id: surveyId, sectionId } = await params;

  const [deleted] = await db
    .delete(surveySections)
    .where(
      and(
        eq(surveySections.id, sectionId),
        eq(surveySections.surveyId, surveyId),
        eq(surveySections.tenantId, tenantId)
      )
    )
    .returning({ id: surveySections.id });

  if (!deleted) {
    return apiNotFound('Section not found');
  }

  return apiNoContent();
}
