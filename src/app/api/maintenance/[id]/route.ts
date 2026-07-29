import {
  db,
  maintenanceRequests,
  users,
  properties,
  maintenanceTeams,
  serviceProviders,
  requestHistories,
  notifications,
  agentAccesses,
  revalidateDashboard,
  apiSuccess,
  apiForbidden,
  apiNotFound,
  now,
  withErrorHandler,
} from '@api/server';

import { requireAuth } from '@/shared/api/auth-utils';

import { hasPermission } from '@shared/lib';
import { eq, and } from 'drizzle-orm';

import { withTenant } from '@entities/tenant/server';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

// Valid status transitions for the 7-value lifecycle
const VALID_STATUSES = [
  'SUBMITTED',
  'ASSIGNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'PENDING_PARTS',
  'COMPLETED',
  'CANCELLED',
] as const;
/**
 * GET /api/maintenance/[id] - Get a single maintenance request by ID
 * Includes team and provider assignment details.
 * @deprecated Use `trpc.maintenance.getRequest` instead
 */
export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const auth = await requireAuth(request, { module: 'maintenance' });
    if (!auth.success) return auth.response;
    const authData = auth.data;

    const canViewAll = hasPermission(authData.role, 'requests');

    // Get the request first to check ownership and tenant
    const [mrRow] = await db
      .select()
      .from(maintenanceRequests)
      .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
      .limit(1);

    if (!mrRow) {
      return apiNotFound('Not found');
    }

    // Check if user can view this request
    if (!canViewAll && mrRow.userId !== authData.userId) {
      return apiForbidden();
    }

    // Get user info and property address
    const [uRow] = await db.select().from(users).where(eq(users.id, mrRow.userId)).limit(1);

    let address = null;
    if (mrRow.propertyId) {
      const [propRow] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, mrRow.propertyId))
        .limit(1);

      if (propRow) {
        address = { street: propRow.street, unit: propRow.unit };
      }
    }

    // Get team and provider details if assigned
    let assignedTeam = null;
    if (mrRow.assignedTeamId) {
      const [teamRow] = await db
        .select({
          id: maintenanceTeams.id,
          name: maintenanceTeams.name,
          trade: maintenanceTeams.trade,
        })
        .from(maintenanceTeams)
        .where(eq(maintenanceTeams.id, mrRow.assignedTeamId))
        .limit(1);
      assignedTeam = teamRow || null;
    }

    let assignedProvider = null;
    if (mrRow.assignedProviderId) {
      const [providerRow] = await db
        .select({
          id: serviceProviders.id,
          companyName: serviceProviders.companyName,
          trade: serviceProviders.trade,
        })
        .from(serviceProviders)
        .where(eq(serviceProviders.id, mrRow.assignedProviderId))
        .limit(1);
      assignedProvider = providerRow || null;
    }

    return apiSuccess({
      id: mrRow.id,
      userId: mrRow.userId,
      propertyId: mrRow.propertyId,
      category: mrRow.category,
      priority: mrRow.priority,
      description: mrRow.description,
      status: mrRow.status,
      images: mrRow.images,
      assignedTo: mrRow.assignedTo,
      vendor: mrRow.vendor,
      scheduledDate: mrRow.scheduledDate,
      estimatedCost: mrRow.estimatedCost,
      actualCost: mrRow.actualCost,
      resolution: mrRow.resolution,
      completedAt: mrRow.completedAt,
      createdAt: mrRow.createdAt,
      updatedAt: mrRow.updatedAt,
      // New ticketing fields
      ticketNumber: mrRow.ticketNumber,
      preferredDate: mrRow.preferredDate?.toISOString()?.split('T')[0] ?? null,
      preferredTime: mrRow.preferredTime,
      assignedTeamId: mrRow.assignedTeamId,
      assignedProviderId: mrRow.assignedProviderId,
      // Resolved assignment details
      assignedTeam,
      assignedProvider,
      user: uRow
        ? {
            name: uRow.name,
            email: uRow.email,
            address: address,
          }
        : null,
    });
  }
);

/**
 * PATCH /api/maintenance/[id] - Update a maintenance request
 * Supports all 7 status values and tracks team/provider assignment changes.
 * @deprecated Use `trpc.maintenance.updateRequest` instead
 */
export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const auth = await requireAuth(request, { permission: 'requests', module: 'maintenance' });
    if (!auth.success) return auth.response;
    const authData = auth.data;

    const body = await request.json();

    // Get current request to compare values (with tenant check)
    const [existing] = await db
      .select()
      .from(maintenanceRequests)
      .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return apiNotFound('Not found');
    }

    const ts = now();
    const updates: Partial<typeof maintenanceRequests.$inferInsert> = {
      updatedAt: ts,
    };

    // Track status changes — validate against 7-value enum
    if (body.status && body.status !== existing.status) {
      if (!VALID_STATUSES.includes(body.status)) {
        return apiForbidden(
          `Invalid status: ${body.status}. Valid values: ${VALID_STATUSES.join(', ')}`
        );
      }
      updates.status = body.status;
      if (body.status === 'COMPLETED') {
        updates.completedAt = ts;
      }
      await db.insert(requestHistories).values({
        id: createId(),
        requestId: id,
        userId: authData.userId,
        field: 'status',
        oldValue: existing.status,
        newValue: body.status,
        comment: body.comment || null,
      });
    }

    if (body.priority && body.priority !== existing.priority) {
      updates.priority = body.priority;
      await db.insert(requestHistories).values({
        id: createId(),
        requestId: id,
        userId: authData.userId,
        field: 'priority',
        oldValue: existing.priority,
        newValue: body.priority,
        comment: body.comment || null,
      });
    }

    if (body.description && body.description !== existing.description) {
      updates.description = body.description;
    }

    if (body.assignedTo !== undefined && body.assignedTo !== existing.assignedTo) {
      updates.assignedTo = body.assignedTo || null;
      await db.insert(requestHistories).values({
        id: createId(),
        requestId: id,
        userId: authData.userId,
        field: 'assignedTo',
        oldValue: existing.assignedTo || null,
        newValue: body.assignedTo || 'Unassigned',
        comment: body.comment || null,
      });
    }

    if (body.vendor !== undefined && body.vendor !== existing.vendor) {
      updates.vendor = body.vendor || null;
      await db.insert(requestHistories).values({
        id: createId(),
        requestId: id,
        userId: authData.userId,
        field: 'vendor',
        oldValue: existing.vendor || null,
        newValue: body.vendor || 'None',
        comment: body.comment || null,
      });
    }

    // Track assignedTeamId changes
    if (body.assignedTeamId !== undefined && body.assignedTeamId !== existing.assignedTeamId) {
      updates.assignedTeamId = body.assignedTeamId || null;

      let oldLabel = 'Unassigned';
      let newLabel = 'Unassigned';

      if (existing.assignedTeamId) {
        const [oldTeam] = await db
          .select({ name: maintenanceTeams.name })
          .from(maintenanceTeams)
          .where(eq(maintenanceTeams.id, existing.assignedTeamId))
          .limit(1);
        oldLabel = oldTeam?.name || existing.assignedTeamId;
      }

      if (body.assignedTeamId) {
        const [newTeam] = await db
          .select({ name: maintenanceTeams.name })
          .from(maintenanceTeams)
          .where(eq(maintenanceTeams.id, body.assignedTeamId))
          .limit(1);
        newLabel = newTeam?.name || body.assignedTeamId;
      }

      await db.insert(requestHistories).values({
        id: createId(),
        requestId: id,
        userId: authData.userId,
        field: 'assignedTeam',
        oldValue: oldLabel,
        newValue: newLabel,
        comment: body.comment || null,
      });
    }

    // Track assignedProviderId changes
    if (
      body.assignedProviderId !== undefined &&
      body.assignedProviderId !== existing.assignedProviderId
    ) {
      updates.assignedProviderId = body.assignedProviderId || null;

      let oldLabel = 'Unassigned';
      let newLabel = 'Unassigned';

      if (existing.assignedProviderId) {
        const [oldProvider] = await db
          .select({ companyName: serviceProviders.companyName })
          .from(serviceProviders)
          .where(eq(serviceProviders.id, existing.assignedProviderId))
          .limit(1);
        oldLabel = oldProvider?.companyName || existing.assignedProviderId;
      }

      if (body.assignedProviderId) {
        const [newProvider] = await db
          .select({ companyName: serviceProviders.companyName })
          .from(serviceProviders)
          .where(eq(serviceProviders.id, body.assignedProviderId))
          .limit(1);
        newLabel = newProvider?.companyName || body.assignedProviderId;
      }

      await db.insert(requestHistories).values({
        id: createId(),
        requestId: id,
        userId: authData.userId,
        field: 'assignedProvider',
        oldValue: oldLabel,
        newValue: newLabel,
        comment: body.comment || null,
      });
    }

    if (body.scheduledDate !== undefined) {
      const newDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
      const oldDate = existing.scheduledDate ? existing.scheduledDate.toISOString() : null;
      const newDateStr = newDate ? newDate.toISOString() : null;
      if (newDateStr !== oldDate) {
        updates.scheduledDate = newDate;
        await db.insert(requestHistories).values({
          id: createId(),
          requestId: id,
          userId: authData.userId,
          field: 'scheduledDate',
          oldValue: oldDate ?? undefined,
          newValue: newDateStr ?? undefined,
          comment: body.comment || null,
        });
      }
    }

    if (body.estimatedCost !== undefined) {
      updates.estimatedCost = body.estimatedCost || null;
    }

    if (body.actualCost !== undefined) {
      updates.actualCost = body.actualCost || null;
    }

    if (body.resolution !== undefined && body.resolution !== existing.resolution) {
      updates.resolution = body.resolution || null;
    }

    // Landlord-specific actions (only for LANDLORD-routed requests)
    const landlordAction = body.landlordAction as string | undefined;

    if (landlordAction && existing.routingType === 'LANDLORD') {
      // Verify caller is the landlord
      if (existing.landlordId !== authData.userId) {
        return apiForbidden('Only the assigned landlord can perform this action');
      }

      if (landlordAction === 'acknowledge') {
        updates.status = 'ASSIGNED';

        // Notify the original requester
        await db.insert(notifications).values({
          id: createId(),
          tenantId,
          userId: existing.userId,
          senderId: authData.userId,
          title: 'Your maintenance request has been acknowledged',
          message: 'Your landlord has acknowledged your request and will arrange a contractor.',
          type: 'success',
          link: `/maintenance/${id}`,
          payload: { requestId: id },
        });

        await db
          .update(maintenanceRequests)
          .set(updates)
          .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)));

        revalidateDashboard();

        return apiSuccess({ id, status: 'ASSIGNED', landlordAction: 'acknowledged' });
      }

      if (landlordAction === 'assign_contractor') {
        const contractorId = body.contractorId as string | undefined;
        if (!contractorId) {
          return apiForbidden('contractorId is required for assign_contractor');
        }

        // Verify contractor is an active ServiceProvider
        const [provider] = await db
          .select({ id: serviceProviders.id, userId: serviceProviders.userId })
          .from(serviceProviders)
          .where(
            and(
              eq(serviceProviders.id, contractorId),
              eq(serviceProviders.tenantId, tenantId),
              eq(serviceProviders.isActive, true)
            )
          )
          .limit(1);

        if (!provider) {
          return apiNotFound('ServiceProvider not found or inactive');
        }

        // Create a scoped AgentAccess delegation for the contractor
        const delegationId = createId();
        const agentUserId = provider.userId ?? contractorId;
        const delegationNow = new Date();
        await db.insert(agentAccesses).values({
          id: delegationId,
          tenantId,
          agentId: agentUserId,
          propertyId: existing.propertyId!,
          grantedById: authData.userId,
          permissions: ['maintenance:read', 'maintenance:coordinate'],
          originalPermissions: ['maintenance:read', 'maintenance:coordinate'],
          status: 'ACTIVE',
          acceptedAt: delegationNow,
          startedAt: delegationNow,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: delegationNow,
          updatedAt: delegationNow,
        });

        // Log delegation action
        try {
          const { logDelegationAction } = await import('@api/shared/delegations');
          await logDelegationAction({
            tenantId,
            delegationId,
            action: 'accepted' as const,
            actorId: authData.userId,
            metadata: {
              context: 'maintenance_contractor_assignment',
              requestId: id,
              contractorId,
            },
          });
        } catch {
          // Log failure is non-blocking
        }

        updates.status = 'IN_PROGRESS';
        updates.assignedProviderId = contractorId;

        await db
          .update(maintenanceRequests)
          .set(updates)
          .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)));

        revalidateDashboard();

        return apiSuccess({
          id,
          status: 'IN_PROGRESS',
          landlordAction: 'contractor_assigned',
          delegationId,
        });
      }
    }

    const [maintenanceRequest] = await db
      .update(maintenanceRequests)
      .set(updates)
      .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
      .returning();

    revalidateDashboard();

    return apiSuccess(maintenanceRequest);
  }
);

/**
 * DELETE /api/maintenance/[id] - Delete a maintenance request
 * @deprecated Use `trpc.maintenance.deleteRequest` instead
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { tenantId } = await withTenant();

    const auth = await requireAuth(request, { permission: 'requests', module: 'maintenance' });
    if (!auth.success) return auth.response;
    const authData = auth.data;

    // Soft-delete the maintenance request with tenant check
    await db
      .update(maintenanceRequests)
      .set({ deletedAt: now(), updatedAt: now() })
      .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)));

    return apiSuccess({ success: true });
  }
);
