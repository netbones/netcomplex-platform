import {
  apiCreated,
  apiError,
  apiSuccess,
  db,
  notDeleted,
  now,
  requireAnyPermission,
  serviceProviders,
  withErrorHandler,
} from '@api/server';

import { withTenant } from '@entities/tenant/server';

import { eq, and, desc } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

export const dynamic = 'force-dynamic';

/**
 * GET /api/maintenance/providers - List service providers for the tenant
 * @query isActive - Filter by active status (true/false, default: all)
 * @deprecated Use `trpc.maintenance.listProviders` instead
 */
export const GET = withErrorHandler(async (request: Request) => {
  const authError = await requireAnyPermission(['requests']);
  if (authError) return authError;

  const { tenantId } = await withTenant();
  const { searchParams } = new URL(request.url);
  const isActiveFilter = searchParams.get('isActive');

  const conditions = [eq(serviceProviders.tenantId, tenantId), notDeleted(serviceProviders)];

  if (isActiveFilter === 'true') {
    conditions.push(eq(serviceProviders.isActive, true));
  } else if (isActiveFilter === 'false') {
    conditions.push(eq(serviceProviders.isActive, false));
  }

  const providers = await db
    .select()
    .from(serviceProviders)
    .where(and(...conditions))
    .orderBy(desc(serviceProviders.createdAt));

  return apiSuccess(providers);
});

/**
 * POST /api/maintenance/providers - Create a new service provider
 * @body companyName - Company name (required)
 * @body trade - Trade category (required): PLUMBING, ELECTRICAL, HVAC, LANDSCAPING, GENERAL
 * @body contactName - Contact person name (optional)
 * @body phone - Phone number (optional)
 * @body email - Email address (optional)
 * @deprecated Use `trpc.maintenance.createProvider` instead
 */
export const POST = withErrorHandler(async (request: Request) => {
  const authError = await requireAnyPermission(['requests']);
  if (authError) return authError;

  const { tenantId } = await withTenant();

  const body = await request.json();
  const { companyName, trade, contactName, phone, email } = body;

  if (!companyName || !trade) {
    return apiError('VALIDATION_ERROR', 'companyName and trade are required', 400);
  }

  const ts = now();
  const provider = await db
    .insert(serviceProviders)
    .values({
      id: createId(),
      tenantId,
      companyName,
      trade,
      contactName: contactName || null,
      phone: phone || null,
      email: email || null,
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();

  return apiCreated(provider[0]);
});
