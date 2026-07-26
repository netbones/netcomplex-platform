import {
  db,
  maintenanceTeams,
  requireAnyPermission,
  apiSuccess,
  apiNotFound,
  apiGone,
  now,
  notDeleted,
  withErrorHandler,
} from '@api/server';

import { withTenant } from '@entities/tenant/server';

import { eq, and } from 'drizzle-orm';

export const maxDuration = 8;

/**
 * PATCH /api/maintenance/teams/[id] - Update a maintenance team
 * @body name - Updated team name
 * @body trade - Updated trade category
 * @body contactName - Updated contact person
 * @body isActive - Toggle active status
 * @deprecated Use `trpc.maintenance.updateTeam` instead
 */
export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const authError = await requireAnyPermission(['requests']);
    if (authError) return authError;

    const { tenantId } = await withTenant();

    // Verify team belongs to tenant
    const [existing] = await db
      .select()
      .from(maintenanceTeams)
      .where(
        and(
          eq(maintenanceTeams.id, id),
          eq(maintenanceTeams.tenantId, tenantId),
          notDeleted(maintenanceTeams)
        )
      )
      .limit(1);

    if (!existing) {
      return apiNotFound('Team not found');
    }

    if (existing.deletedAt) {
      return apiGone('Team has been deleted');
    }

    const body = await request.json();
    const updates: Partial<typeof maintenanceTeams.$inferInsert> = { updatedAt: now() };

    if (body.name !== undefined) updates.name = body.name;
    if (body.trade !== undefined) updates.trade = body.trade;
    if (body.contactName !== undefined) updates.contactName = body.contactName;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const [updated] = await db
      .update(maintenanceTeams)
      .set(updates)
      .where(and(eq(maintenanceTeams.id, id), eq(maintenanceTeams.tenantId, tenantId)))
      .returning();

    return apiSuccess(updated);
  }
);

/**
 * DELETE /api/maintenance/teams/[id] - Soft-delete a maintenance team
 * @deprecated Use `trpc.maintenance.deleteTeam` instead
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const authError = await requireAnyPermission(['requests']);
    if (authError) return authError;

    const { tenantId } = await withTenant();

    // Verify team belongs to tenant
    const [existing] = await db
      .select()
      .from(maintenanceTeams)
      .where(
        and(
          eq(maintenanceTeams.id, id),
          eq(maintenanceTeams.tenantId, tenantId),
          notDeleted(maintenanceTeams)
        )
      )
      .limit(1);

    if (!existing) {
      return apiNotFound('Team not found');
    }

    // Soft-delete: set deletedAt
    await db
      .update(maintenanceTeams)
      .set({ deletedAt: now(), updatedAt: now() })
      .where(eq(maintenanceTeams.id, id));

    return apiSuccess({ success: true, deleted: true });
  }
);
