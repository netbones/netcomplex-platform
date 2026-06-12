import {
  db,
  maintenanceRequests,
  maintenanceTeams,
  serviceProviders,
  requestHistories,
  requireAnyPermission,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiError,
  apiForbidden,
  auth,
  revalidateDashboard,
} from '@api/server';

import { withTenant } from '@entities/tenant';

import { hasPermission } from '@entities/tenant';
import { eq, and } from 'drizzle-orm';

async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const { db: dbInstance, users } = await import('@api/server');
  const [userResult] = await dbInstance
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return {
    session,
    userId: session.user.id,
    role: userResult?.role || 'RESIDENT',
  };
}

/**
 * POST /api/maintenance/[id]/assign - Assign/reassign a maintenance ticket
 * @body teamId - ID of the maintenance team to assign (optional)
 * @body providerId - ID of the service provider to assign (optional)
 * @body reason - Reason for assignment/reassignment (optional, required for reassignment)
 *
 * At least one of teamId or providerId is required.
 * Creates RequestHistory entries for assignment changes.
 * Supports reassignment from team → provider with reason.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authError = await requireAnyPermission(['requests']);
  if (authError) return authError;

  const { tenantId } = await withTenant();

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return apiUnauthorized();
  }

  const canViewAll = hasPermission(authData.role, 'requests');
  if (!canViewAll) {
    return apiForbidden();
  }

  // Verify the request belongs to this tenant
  const [existing] = await db
    .select()
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return apiNotFound('Maintenance request not found');
  }

  const body = await request.json();
  const { teamId, providerId, reason } = body;

  // At least one assignment target is required
  if (!teamId && !providerId) {
    return apiError('VALIDATION_ERROR', 'At least one of teamId or providerId is required', 400);
  }

  // Validate teamId if provided
  if (teamId) {
    const [team] = await db
      .select()
      .from(maintenanceTeams)
      .where(and(eq(maintenanceTeams.id, teamId), eq(maintenanceTeams.tenantId, tenantId)))
      .limit(1);

    if (!team || !team.isActive) {
      return apiError('VALIDATION_ERROR', 'Invalid or inactive team', 400);
    }
  }

  // Validate providerId if provided
  if (providerId) {
    const [provider] = await db
      .select()
      .from(serviceProviders)
      .where(and(eq(serviceProviders.id, providerId), eq(serviceProviders.tenantId, tenantId)))
      .limit(1);

    if (!provider || !provider.isActive) {
      return apiError('VALIDATION_ERROR', 'Invalid or inactive provider', 400);
    }
  }

  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { updatedAt: now };

  // Track team assignment changes
  if (teamId !== undefined && teamId !== existing.assignedTeamId) {
    const oldTeamId = existing.assignedTeamId;
    updates.assignedTeamId = teamId || null;

    // Create history entry for team assignment
    let oldLabel = 'Unassigned';
    let newLabel = 'Unassigned';

    if (oldTeamId) {
      const [oldTeam] = await db
        .select({ name: maintenanceTeams.name })
        .from(maintenanceTeams)
        .where(eq(maintenanceTeams.id, oldTeamId))
        .limit(1);
      oldLabel = oldTeam?.name || oldTeamId;
    }

    if (teamId) {
      const [newTeam] = await db
        .select({ name: maintenanceTeams.name })
        .from(maintenanceTeams)
        .where(eq(maintenanceTeams.id, teamId))
        .limit(1);
      newLabel = newTeam?.name || teamId;
    }

    await db.insert(requestHistories).values({
      id: crypto.randomUUID(),
      requestId: id,
      userId: authData.userId,
      field: 'assignedTeam',
      oldValue: oldLabel,
      newValue: newLabel,
      comment: reason || null,
    });

    // Auto-transition: if request is SUBMITTED and team is assigned, set to ASSIGNED
    if (existing.status === 'SUBMITTED' && teamId) {
      updates.status = 'ASSIGNED';
      await db.insert(requestHistories).values({
        id: crypto.randomUUID(),
        requestId: id,
        userId: authData.userId,
        field: 'status',
        oldValue: 'SUBMITTED',
        newValue: 'ASSIGNED',
        comment: 'Auto-transitioned on team assignment',
      });
    }
  }

  // Track provider assignment changes
  if (providerId !== undefined && providerId !== existing.assignedProviderId) {
    const oldProviderId = existing.assignedProviderId;
    updates.assignedProviderId = providerId || null;

    // Create history entry for provider assignment
    let oldLabel = 'Unassigned';
    let newLabel = 'Unassigned';

    if (oldProviderId) {
      const [oldProvider] = await db
        .select({ companyName: serviceProviders.companyName })
        .from(serviceProviders)
        .where(eq(serviceProviders.id, oldProviderId))
        .limit(1);
      oldLabel = oldProvider?.companyName || oldProviderId;
    }

    if (providerId) {
      const [newProvider] = await db
        .select({ companyName: serviceProviders.companyName })
        .from(serviceProviders)
        .where(eq(serviceProviders.id, providerId))
        .limit(1);
      newLabel = newProvider?.companyName || providerId;
    }

    await db.insert(requestHistories).values({
      id: crypto.randomUUID(),
      requestId: id,
      userId: authData.userId,
      field: 'assignedProvider',
      oldValue: oldLabel,
      newValue: newLabel,
      comment: reason || null,
    });

    // Auto-transition: if request is SUBMITTED and provider is assigned, set to ASSIGNED
    if (existing.status === 'SUBMITTED' && providerId && !teamId) {
      updates.status = 'ASSIGNED';
      await db.insert(requestHistories).values({
        id: crypto.randomUUID(),
        requestId: id,
        userId: authData.userId,
        field: 'status',
        oldValue: 'SUBMITTED',
        newValue: 'ASSIGNED',
        comment: 'Auto-transitioned on provider assignment',
      });
    }
  }

  // Update the maintenance request
  const [updated] = await db
    .update(maintenanceRequests)
    .set(updates)
    .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
    .returning();

  // Fetch team and provider details for the response
  let team = null;
  let provider = null;

  if (updated.assignedTeamId) {
    const [teamRow] = await db
      .select({
        id: maintenanceTeams.id,
        name: maintenanceTeams.name,
        trade: maintenanceTeams.trade,
      })
      .from(maintenanceTeams)
      .where(eq(maintenanceTeams.id, updated.assignedTeamId))
      .limit(1);
    team = teamRow || null;
  }

  if (updated.assignedProviderId) {
    const [providerRow] = await db
      .select({
        id: serviceProviders.id,
        companyName: serviceProviders.companyName,
        trade: serviceProviders.trade,
      })
      .from(serviceProviders)
      .where(eq(serviceProviders.id, updated.assignedProviderId))
      .limit(1);
    provider = providerRow || null;
  }

  revalidateDashboard();

  return apiSuccess({
    ...updated,
    assignedTeam: team,
    assignedProvider: provider,
  });
}
