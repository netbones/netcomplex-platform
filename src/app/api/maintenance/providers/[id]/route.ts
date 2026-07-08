import {
  db,
  serviceProviders,
  requireAnyPermission,
  apiSuccess,
  apiNotFound,
  now,
  notDeleted,
  withErrorHandler,
} from '@api/server';

import { withTenant } from '@entities/tenant/server';

import { eq, and } from 'drizzle-orm';

export const maxDuration = 8;

/**
 * PATCH /api/maintenance/providers/[id] - Update a service provider
 * @body companyName - Updated company name
 * @body trade - Updated trade category
 * @body contactName - Updated contact person
 * @body phone - Updated phone number
 * @body email - Updated email address
 * @body isActive - Toggle active status
 */
export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const authError = await requireAnyPermission(['requests']);
    if (authError) return authError;

    const { tenantId } = await withTenant();

    // Verify provider belongs to tenant
    const [existing] = await db
      .select()
      .from(serviceProviders)
      .where(
        and(
          eq(serviceProviders.id, id),
          eq(serviceProviders.tenantId, tenantId),
          notDeleted(serviceProviders)
        )
      )
      .limit(1);

    if (!existing) {
      return apiNotFound('Provider not found');
    }

    const body = await request.json();
    const updates: Partial<typeof serviceProviders.$inferInsert> = { updatedAt: now() };

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
);

/**
 * DELETE /api/maintenance/providers/[id] - Soft-delete a service provider
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const authError = await requireAnyPermission(['requests']);
    if (authError) return authError;

    const { tenantId } = await withTenant();

    // Verify provider belongs to tenant
    const [existing] = await db
      .select()
      .from(serviceProviders)
      .where(
        and(
          eq(serviceProviders.id, id),
          eq(serviceProviders.tenantId, tenantId),
          notDeleted(serviceProviders)
        )
      )
      .limit(1);

    if (!existing) {
      return apiNotFound('Provider not found');
    }

    // Soft-delete: set deletedAt
    await db
      .update(serviceProviders)
      .set({ deletedAt: now(), updatedAt: now() })
      .where(eq(serviceProviders.id, id));

    return apiSuccess({ success: true, deleted: true });
  }
);
