import { db, serviceProviders, maintenanceRequests } from '@api/db';
import { requireAnyPermission } from '@api/auth-utils';
import { withTenant } from '@entities/tenant';
import { apiSuccess, apiNotFound, apiError } from '@api/api-response';
import { eq, and, sql } from 'drizzle-orm';

/**
 * PATCH /api/maintenance/providers/[id] - Update a service provider
 * @body companyName - Updated company name
 * @body trade - Updated trade category
 * @body contactName - Updated contact person
 * @body phone - Updated phone number
 * @body email - Updated email address
 * @body isActive - Toggle active status
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authError = await requireAnyPermission(['requests']);
  if (authError) return authError;

  const { tenantId } = await withTenant();

  // Verify provider belongs to tenant
  const [existing] = await db
    .select()
    .from(serviceProviders)
    .where(and(eq(serviceProviders.id, id), eq(serviceProviders.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return apiNotFound('Provider not found');
  }

  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { updatedAt: new Date() };

  if (body.companyName !== undefined) updates.companyName = body.companyName;
  if (body.trade !== undefined) updates.trade = body.trade;
  if (body.contactName !== undefined) updates.contactName = body.contactName;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.email !== undefined) updates.email = body.email;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  const [updated] = await db
    .update(serviceProviders)
    .set(updates)
    .where(and(eq(serviceProviders.id, id), eq(serviceProviders.tenantId, tenantId)))
    .returning();

  return apiSuccess(updated);
}

/**
 * DELETE /api/maintenance/providers/[id] - Archive (soft-delete) a service provider
 * Hard delete only if no active assignments reference this provider
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authError = await requireAnyPermission(['requests']);
  if (authError) return authError;

  const { tenantId } = await withTenant();

  // Verify provider belongs to tenant
  const [existing] = await db
    .select()
    .from(serviceProviders)
    .where(and(eq(serviceProviders.id, id), eq(serviceProviders.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return apiNotFound('Provider not found');
  }

  // Check for active assignments
  const [assignmentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(maintenanceRequests)
    .where(
      and(
        eq(maintenanceRequests.assignedProviderId, id),
        sql`${maintenanceRequests.status} NOT IN ('COMPLETED', 'CANCELLED')`
      )
    );

  if (assignmentCount?.count > 0) {
    // Soft-delete: set isActive = false
    const [updated] = await db
      .update(serviceProviders)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(serviceProviders.id, id))
      .returning();

    return apiSuccess({ ...updated, archived: true, activeAssignments: assignmentCount.count });
  }

  // Hard delete: no active assignments
  await db.delete(serviceProviders).where(eq(serviceProviders.id, id));

  return apiSuccess({ success: true, deleted: true });
}
