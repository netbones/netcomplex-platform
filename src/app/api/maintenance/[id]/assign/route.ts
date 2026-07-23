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
  now,
  revalidateDashboard,
  withErrorHandler,
  maintenanceTeamMembers,
  notifications,
  emitEvent,
  getSessionAndRole,
  guardSuspension,
} from '@api/server';

import { withTenant, assertModuleEnabled } from '@entities/tenant/server';

import { hasPermission } from '@shared/lib';
import { eq, and } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;
/**
 * POST /api/maintenance/[id]/assign - Assign/reassign a maintenance ticket
 * @body teamId - ID of the maintenance team to assign (optional)
 * @body providerId - ID of the service provider to assign (optional)
 * @body reason - Reason for assignment/reassignment (optional, required for reassignment)
 *
 * At least one of teamId or providerId is required.
 * Creates RequestHistory entries for assignment changes.
 * Supports reassignment from team → provider with reason.
 * @deprecated Use `trpc.maintenance.assignRequest` instead
 */
export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const authError = await requireAnyPermission(['requests']);
    if (authError) return authError;

    const { tenantId } = await withTenant();

    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }
    const guard = guardSuspension(authData);
    if (guard) return guard;
    const featureCheck = await assertModuleEnabled('maintenance');
    if (featureCheck) return featureCheck;

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

    const ts = now();
    const updates: Partial<typeof maintenanceRequests.$inferInsert> = { updatedAt: ts };

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
        id: createId(),
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
          id: createId(),
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
        id: createId(),
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
          id: createId(),
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

    if (teamId && team) {
      const members = await db
        .select({ userId: maintenanceTeamMembers.userId })
        .from(maintenanceTeamMembers)
        .where(eq(maintenanceTeamMembers.teamId, teamId));

      if (members.length > 0) {
        const memberIds = members.map(m => m.userId);
        const ticketNumber = existing.ticketNumber;
        const ticketLabel = ticketNumber ? `#${ticketNumber}` : `Request ${id}`;
        const title = `Assigned to your team: ${ticketLabel}`;
        const message = `${ticketLabel} (${existing.category.replace(/_/g, ' ')}) has been assigned to ${team.name}.`;

        for (const member of members) {
          await db.insert(notifications).values({
            id: createId(),
            tenantId,
            userId: member.userId,
            senderId: authData.userId,
            title,
            message,
            type: 'info',
            category: 'SYSTEM',
            link: `/dashboard/providers`,
            payload: {
              requestId: id,
              teamId,
              event: 'team_assigned',
            },
          });
        }

        emitEvent('maintenance.team_assigned', {
          tenantId,
          requestId: id,
          teamId,
          teamName: team.name,
          category: existing.category,
          memberUserIds: memberIds,
        });
      }
    }

    return apiSuccess({
      ...updated,
      assignedTeam: team,
      assignedProvider: provider,
    });
  }
);
