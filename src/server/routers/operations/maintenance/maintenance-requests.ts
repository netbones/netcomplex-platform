import { notDeleted, toEnvelope } from '@api/server';
import { maintenanceRequestDto, maintenanceRequestDetailDto } from '@api/server';
import {
  z,
  moduleProcedure,
  privilegedModuleProcedure,
  db,
  maintenanceRequests,
  maintenanceTeams,
  serviceProviders,
  requestNotes,
  internalMaintenanceNotes,
  users,
  properties,
  revalidateDashboard,
  now,
  emitEvent,
  TRPCError,
  hasPermission,
  eq,
  and,
  desc,
  sql,
  listMaintenanceRequests,
  createMaintenanceRequest,
  toMaintenanceRequestViewList,
  RequestIdInput,
  ListRequestsInput,
  CreateRequestInput,
  UpdateRequestInput,
  CreateNoteInput,
  AssignRequestInput,
  RequestStatusEnum,
  getTenantRequest,
  requireRequestsPermission,
  trackRequestChanges,
} from './shared';
import { createId } from '@shared/lib/id';
import { notifyResidentStatusChange, notifyAdminsNewRequest } from '@entities/maintenance/server';

export const maintenanceRequestProcedures = {
  /**
   * List maintenance requests in the current tenant.
   * @tenant
   */
  listRequests: moduleProcedure
    .meta({ requiredModule: 'maintenance' })
    .input(ListRequestsInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const canViewAll = hasPermission(ctx.role, 'requests');
      const scope = input?.scope || 'all';

      const rows = await listMaintenanceRequests({
        tenantId,
        userId: ctx.userId,
        canViewAll,
        scope: scope === 'community' ? 'all' : scope,
        status: input?.status || null,
        priority: input?.priority || null,
        category: input?.category || null,
        dateFrom: input?.dateFrom || null,
        dateTo: input?.dateTo || null,
      });

      return toEnvelope(
        toMaintenanceRequestViewList(rows, scope).map(r => maintenanceRequestDto.parse(r))
      );
    }),

  /**
   * Get a single maintenance request in the current tenant.
   * @tenant
   */
  getRequest: moduleProcedure
    .meta({ requiredModule: 'maintenance' })
    .input(RequestIdInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const req = await getTenantRequest(input.id, tenantId);

      // Residents can only see their own requests unless they have requests permission
      if (!hasPermission(ctx.role, 'requests') && req.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const [userResult, propertyResult, teamResult, providerResult] = await Promise.all([
        db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, req.userId))
          .limit(1),
        req.propertyId
          ? db
              .select({ id: properties.id, street: properties.street, unit: properties.unit })
              .from(properties)
              .where(eq(properties.id, req.propertyId))
              .limit(1)
          : Promise.resolve([]),
        req.assignedTeamId
          ? db
              .select()
              .from(maintenanceTeams)
              .where(eq(maintenanceTeams.id, req.assignedTeamId))
              .limit(1)
          : Promise.resolve([]),
        req.assignedProviderId
          ? db
              .select()
              .from(serviceProviders)
              .where(eq(serviceProviders.id, req.assignedProviderId))
              .limit(1)
          : Promise.resolve([]),
      ]);

      const user = userResult[0] ?? null;
      const property = propertyResult[0] ?? null;
      const team = teamResult[0] ?? null;
      const provider = providerResult[0] ?? null;

      return toEnvelope(
        maintenanceRequestDetailDto.parse({
          ...req,
          user,
          property,
          assignedTeam: team,
          assignedProvider: provider,
        })
      );
    }),

  /**
   * Create a maintenance request in the current tenant.
   * @tenant
   */
  createRequest: moduleProcedure
    .meta({ requiredModule: 'maintenance' })
    .input(CreateRequestInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [created] = await createMaintenanceRequest({
        id: createId(),
        tenantId,
        userId: ctx.userId,
        propertyId: input.propertyId || null,
        category: input.category,
        priority: input.priority,
        description: input.description,
        images: input.images || [],
        preferredDate: input.preferredDate || null,
        preferredTime: input.preferredTime || null,
      });

      emitEvent('maintenance.created', {
        requestId: created.id,
        tenantId,
        userId: ctx.userId,
        category: input.category,
      });

      // Notify tenant admins (roles with `requests` permission) of the new request
      await notifyAdminsNewRequest({
        tenantId,
        requestId: created.id,
        requesterId: ctx.userId,
        category: input.category,
        priority: input.priority,
      });

      revalidateDashboard();
      return toEnvelope(maintenanceRequestDto.parse(created));
    }),

  /**
   * Update a maintenance request. Requires elevated permissions.
   * @privileged
   */
  updateRequest: privilegedModuleProcedure
    .meta({ requiredModule: 'maintenance' })
    .input(UpdateRequestInput)
    .mutation(async ({ input, ctx }) => {
      requireRequestsPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const existing = await getTenantRequest(input.id, tenantId);

      const updateData: Record<string, unknown> = {
        updatedAt: now(),
      };

      if (input.status !== undefined) {
        const parsed = RequestStatusEnum.safeParse(input.status);
        if (!parsed.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid status value' });
        }
        updateData.status = input.status;

        if (input.status === 'COMPLETED') {
          updateData.completedAt = new Date();
        }
      }
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo;
      if (input.vendor !== undefined) updateData.vendor = input.vendor;
      if (input.scheduledDate !== undefined) {
        updateData.scheduledDate = new Date(input.scheduledDate);
      }
      if (input.estimatedCost !== undefined) updateData.estimatedCost = input.estimatedCost;
      if (input.actualCost !== undefined) updateData.actualCost = input.actualCost;
      if (input.resolution !== undefined) updateData.resolution = input.resolution;
      if (input.assignedTeamId !== undefined) {
        updateData.assignedTeamId = input.assignedTeamId;
      }
      if (input.assignedProviderId !== undefined) {
        updateData.assignedProviderId = input.assignedProviderId;
      }

      const [updated] = await db
        .update(maintenanceRequests)
        .set(updateData)
        .where(
          and(eq(maintenanceRequests.id, input.id), eq(maintenanceRequests.tenantId, tenantId))
        )
        .returning();

      await trackRequestChanges(input.id, ctx.userId, existing, updateData);

      if (updated && updateData.status && updateData.status !== existing.status) {
        await notifyResidentStatusChange({
          tenantId,
          requestId: input.id,
          residentUserId: existing.userId,
          senderId: ctx.userId,
          status: updateData.status as string,
          category: existing.category,
          ticketNumber: existing.ticketNumber,
        });
      }

      revalidateDashboard();
      return toEnvelope(maintenanceRequestDto.parse(updated));
    }),

  /**
   * Soft-delete a maintenance request. Requires elevated permissions.
   * @privileged
   */
  deleteRequest: privilegedModuleProcedure
    .meta({ requiredModule: 'maintenance' })
    .input(RequestIdInput)
    .mutation(async ({ input, ctx }) => {
      requireRequestsPermission(ctx.role);

      const tenantId = ctx.tenantId;

      await getTenantRequest(input.id, tenantId);

      await db
        .update(maintenanceRequests)
        .set({ deletedAt: now() })
        .where(
          and(eq(maintenanceRequests.id, input.id), eq(maintenanceRequests.tenantId, tenantId))
        );

      revalidateDashboard();
      return toEnvelope({ success: true });
    }),

  /**
   * List notes for a maintenance request in the current tenant.
   * @tenant
   */
  listNotes: moduleProcedure
    .meta({ requiredModule: 'maintenance' })
    .input(z.object({ requestId: z.string() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const req = await getTenantRequest(input.requestId, tenantId);

      // Residents can only see their own request's notes
      if (!hasPermission(ctx.role, 'requests') && req.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const conditions = [
        eq(requestNotes.requestId, input.requestId),
        eq(requestNotes.isInternal, false),
      ];

      const publicNotes = await db
        .select({
          id: requestNotes.id,
          requestId: requestNotes.requestId,
          userId: requestNotes.userId,
          content: requestNotes.content,
          isInternal: sql<boolean>`false`,
          createdAt: requestNotes.createdAt,
          author: {
            name: users.name,
          },
        })
        .from(requestNotes)
        .leftJoin(users, eq(requestNotes.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(requestNotes.createdAt));

      let internalNotes: typeof publicNotes = [];

      if (hasPermission(ctx.role, 'requests')) {
        internalNotes = await db
          .select({
            id: internalMaintenanceNotes.id,
            requestId: internalMaintenanceNotes.requestId,
            userId: internalMaintenanceNotes.userId,
            content: internalMaintenanceNotes.content,
            isInternal: sql<boolean>`true`,
            createdAt: internalMaintenanceNotes.createdAt,
            author: {
              name: users.name,
            },
          })
          .from(internalMaintenanceNotes)
          .leftJoin(users, eq(internalMaintenanceNotes.userId, users.id))
          .where(
            and(
              eq(internalMaintenanceNotes.requestId, input.requestId),
              notDeleted(internalMaintenanceNotes)
            )
          )
          .orderBy(desc(internalMaintenanceNotes.createdAt));
      }

      const allNotes = [...publicNotes, ...internalNotes].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      return toEnvelope(allNotes);
    }),

  /**
   * Create a note on a maintenance request. Requires elevated permissions.
   * @privileged
   */
  createNote: privilegedModuleProcedure
    .meta({ requiredModule: 'maintenance' })
    .input(CreateNoteInput)
    .mutation(async ({ input, ctx }) => {
      requireRequestsPermission(ctx.role);

      const tenantId = ctx.tenantId;

      await getTenantRequest(input.requestId, tenantId);

      const noteId = createId();
      const createdAt = new Date();

      if (input.isInternal) {
        const [note] = await db
          .insert(internalMaintenanceNotes)
          .values({
            id: noteId,
            requestId: input.requestId,
            userId: ctx.userId,
            content: input.content,
            createdAt,
            updatedAt: createdAt,
          })
          .returning();

        revalidateDashboard();
        return toEnvelope({ ...note, isInternal: true as const });
      }

      const [note] = await db
        .insert(requestNotes)
        .values({
          id: noteId,
          requestId: input.requestId,
          userId: ctx.userId,
          content: input.content,
          createdAt,
        })
        .returning();

      revalidateDashboard();
      return toEnvelope({ ...note, isInternal: false as const });
    }),

  /**
   * Assign a maintenance request to a team or provider. Requires elevated permissions.
   * @privileged
   */
  assignRequest: privilegedModuleProcedure
    .meta({ requiredModule: 'maintenance' })
    .input(AssignRequestInput)
    .mutation(async ({ input, ctx }) => {
      requireRequestsPermission(ctx.role);

      const tenantId = ctx.tenantId;

      if (!input.teamId && !input.providerId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'At least one of teamId or providerId is required',
        });
      }

      const existing = await getTenantRequest(input.requestId, tenantId);

      // Validate team exists and is active
      if (input.teamId) {
        const [team] = await db
          .select()
          .from(maintenanceTeams)
          .where(
            and(
              eq(maintenanceTeams.id, input.teamId),
              eq(maintenanceTeams.tenantId, tenantId),
              eq(maintenanceTeams.isActive, true),
              notDeleted(maintenanceTeams)
            )
          );
        if (!team) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found or inactive' });
        }
      }

      // Validate provider exists and is active
      if (input.providerId) {
        const [provider] = await db
          .select()
          .from(serviceProviders)
          .where(
            and(
              eq(serviceProviders.id, input.providerId),
              eq(serviceProviders.tenantId, tenantId),
              eq(serviceProviders.isActive, true),
              notDeleted(serviceProviders)
            )
          );
        if (!provider) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found or inactive' });
        }
      }

      const updateData: Record<string, unknown> = { updatedAt: now() };
      if (input.teamId !== undefined) updateData.assignedTeamId = input.teamId;
      if (input.providerId !== undefined) updateData.assignedProviderId = input.providerId;

      // Auto-transition SUBMITTED → ASSIGNED
      if (existing.status === 'SUBMITTED') {
        updateData.status = 'ASSIGNED';
      }

      const [updated] = await db
        .update(maintenanceRequests)
        .set(updateData)
        .where(eq(maintenanceRequests.id, input.requestId))
        .returning();

      await trackRequestChanges(input.requestId, ctx.userId, existing, updateData);

      if (updated && updateData.status && updateData.status !== existing.status) {
        await notifyResidentStatusChange({
          tenantId,
          requestId: input.requestId,
          residentUserId: existing.userId,
          senderId: ctx.userId,
          status: updateData.status as string,
          category: existing.category,
          ticketNumber: existing.ticketNumber,
        });
      }

      revalidateDashboard();
      return toEnvelope(maintenanceRequestDto.parse(updated));
    }),
};
