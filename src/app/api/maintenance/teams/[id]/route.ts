import { db, maintenanceTeams, maintenanceRequests } from '@api/db';
import { requireAnyPermission } from '@api/auth-utils';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { apiSuccess, apiNotFound } from '@api/api-response';
import { eq, and, sql } from 'drizzle-orm';

/**
 * PATCH /api/maintenance/teams/[id] - Update a maintenance team
 * @body name - Updated team name
 * @body trade - Updated trade category
 * @body contactName - Updated contact person
 * @body isActive - Toggle active status
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authError = await requireAnyPermission(['requests']);
  if (authError) return authError;

  const { tenantId } = await withTenant();

  // Verify team belongs to tenant
  const [existing] = await db
    .select()
    .from(maintenanceTeams)
    .where(and(eq(maintenanceTeams.id, id), eq(maintenanceTeams.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return apiNotFound('Team not found');
  }

  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { updatedAt: new Date() };

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

/**
 * DELETE /api/maintenance/teams/[id] - Archive (soft-delete) a maintenance team
 * Hard delete only if no active assignments reference this team
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authError = await requireAnyPermission(['requests']);
  if (authError) return authError;

  const { tenantId } = await withTenant();

  // Verify team belongs to tenant
  const [existing] = await db
    .select()
    .from(maintenanceTeams)
    .where(and(eq(maintenanceTeams.id, id), eq(maintenanceTeams.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return apiNotFound('Team not found');
  }

  // Check for active assignments
  const [assignmentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(maintenanceRequests)
    .where(
      and(
        eq(maintenanceRequests.assignedTeamId, id),
        sql`${maintenanceRequests.status} NOT IN ('COMPLETED', 'CANCELLED')`
      )
    );

  if (assignmentCount?.count > 0) {
    // Soft-delete: set isActive = false
    const [updated] = await db
      .update(maintenanceTeams)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(maintenanceTeams.id, id))
      .returning();

    return apiSuccess({ ...updated, archived: true, activeAssignments: assignmentCount.count });
  }

  // Hard delete: no active assignments
  await db.delete(maintenanceTeams).where(eq(maintenanceTeams.id, id));

  return apiSuccess({ success: true, deleted: true });
}
