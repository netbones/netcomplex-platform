import {
  db,
  maintenanceCategories,
  requireAnyPermission,
  apiSuccess,
  apiCreated,
  apiConflict,
  apiError,
  withErrorHandler,
} from '@api/server';

import { withTenant } from '@entities/tenant/server';

import { eq, and, isNull, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/maintenance/categories - List maintenance categories for the tenant
 * Used by useTenantCategories fallback path
 * @query isActive - Filter by active status (true/false, default: all)
 */
export const GET = withErrorHandler(async (request: Request) => {
  const authError = await requireAnyPermission(['requests']);
  if (authError) return authError;

  const { tenantId } = await withTenant();
  const { searchParams } = new URL(request.url);
  const isActiveFilter = searchParams.get('isActive');

  const conditions = [
    eq(maintenanceCategories.tenantId, tenantId),
    isNull(maintenanceCategories.deletedAt),
  ];

  if (isActiveFilter === 'true') {
    conditions.push(eq(maintenanceCategories.isActive, true));
  } else if (isActiveFilter === 'false') {
    conditions.push(eq(maintenanceCategories.isActive, false));
  }

  const categories = await db
    .select()
    .from(maintenanceCategories)
    .where(and(...conditions))
    .orderBy(desc(maintenanceCategories.createdAt));

  return apiSuccess(categories);
});

/**
 * POST /api/maintenance/categories - Create a new maintenance category
 * @body value - Category slug (required, unique per tenant)
 * @body label - Display label (required)
 * @body description - Description (optional)
 */
export const POST = withErrorHandler(async (request: Request) => {
  const authError = await requireAnyPermission(['requests']);
  if (authError) return authError;

  const { tenantId } = await withTenant();

  const body = await request.json();
  const { value, label, description } = body;

  if (!value || !label) {
    return apiError('VALIDATION_ERROR', 'value and label are required', 400);
  }

  // Check for duplicate value within tenant
  const [existing] = await db
    .select()
    .from(maintenanceCategories)
    .where(
      and(
        eq(maintenanceCategories.tenantId, tenantId),
        eq(maintenanceCategories.value, value),
        isNull(maintenanceCategories.deletedAt)
      )
    )
    .limit(1);

  if (existing) {
    return apiConflict(`Category '${value}' already exists for this tenant`);
  }

  const category = await db
    .insert(maintenanceCategories)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      value,
      label,
      description: description || null,
      isActive: true,
      createdAt: new Date(),
    })
    .returning();

  return apiCreated(category[0]);
});
