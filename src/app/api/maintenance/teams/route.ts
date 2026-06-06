import { db, maintenanceTeams } from '@api/db';
import { requireAnyPermission } from '@api/auth-utils';
import { withTenant } from '@entities/tenant';
import { apiSuccess, apiCreated, apiError } from '@api/api-response';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/maintenance/teams - List maintenance teams for the tenant
 * @query isActive - Filter by active status (true/false, default: all)
 */
export async function GET(request: Request) {
  const authError = await requireAnyPermission(['requests']);
  if (authError) return authError;

  const { tenantId } = await withTenant();
  const { searchParams } = new URL(request.url);
  const isActiveFilter = searchParams.get('isActive');

  const conditions = [eq(maintenanceTeams.tenantId, tenantId)];

  if (isActiveFilter === 'true') {
    conditions.push(eq(maintenanceTeams.isActive, true));
  } else if (isActiveFilter === 'false') {
    conditions.push(eq(maintenanceTeams.isActive, false));
  }

  const teams = await db
    .select()
    .from(maintenanceTeams)
    .where(and(...conditions))
    .orderBy(desc(maintenanceTeams.createdAt));

  return apiSuccess(teams);
}

/**
 * POST /api/maintenance/teams - Create a new maintenance team
 * @body name - Team name (required)
 * @body trade - Trade category (required): PLUMBING, ELECTRICAL, HVAC, LANDSCAPING, GENERAL
 * @body contactName - Contact person name (optional)
 */
export async function POST(request: Request) {
  const authError = await requireAnyPermission(['requests']);
  if (authError) return authError;

  const { tenantId } = await withTenant();

  const body = await request.json();
  const { name, trade, contactName } = body;

  if (!name || !trade) {
    return apiError('VALIDATION_ERROR', 'name and trade are required', 400);
  }

  const now = new Date();
  const team = await db
    .insert(maintenanceTeams)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      name,
      trade,
      contactName: contactName || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return apiCreated(team[0]);
}
