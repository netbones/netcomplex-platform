import { z } from 'zod';
import {
  router,
  protectedProcedure,
  adminProcedure,
  db,
  maintenanceRequests,
  maintenanceTeams,
  maintenanceCategories,
  serviceProviders,
  requestNotes,
  requestHistories,
  users,
  properties,
  revalidateDashboard,
  notDeleted,
  now,
  auth,
  emitEvent,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';

import { eq, and, desc, asc, isNull, InferSelectModel } from 'drizzle-orm';

import {
  listMaintenanceRequests,
  createMaintenanceRequest,
  buildMaintenanceConditions,
  toMaintenanceRequestViewList,
} from '@entities/maintenance/server';

// ──────────────────────────────────────────
// Input schemas
// ──────────────────────────────────────────

const RequestIdInput = z.object({ id: z.string() });

const RequestStatusEnum = z.enum([
  'SUBMITTED',
  'ASSIGNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'PENDING_PARTS',
  'COMPLETED',
  'CANCELLED',
]);

const PriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']);

const ListRequestsInput = z
  .object({
    status: z.string().optional(),
    priority: z.string().optional(),
    category: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    scope: z.enum(['mine', 'all', 'community']).optional().default('all'),
  })
  .optional();

const CreateRequestInput = z.object({
  propertyId: z.string().optional(),
  category: z.string().min(1),
  priority: PriorityEnum,
  description: z.string().min(10).max(2000),
  images: z.array(z.string()).optional().default([]),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
});

const UpdateRequestInput = z.object({
  id: z.string(),
  status: RequestStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  description: z.string().min(10).max(2000).optional(),
  assignedTo: z.string().optional(),
  vendor: z.string().optional(),
  scheduledDate: z.string().optional(),
  estimatedCost: z.string().optional(),
  actualCost: z.string().optional(),
  resolution: z.string().optional(),
  assignedTeamId: z.string().optional(),
  assignedProviderId: z.string().optional(),
});

const CreateNoteInput = z.object({
  requestId: z.string(),
  content: z.string().min(1).max(2000),
  isInternal: z.boolean().optional().default(true),
});

const AssignRequestInput = z.object({
  requestId: z.string(),
  teamId: z.string().optional(),
  providerId: z.string().optional(),
});

const CategoryInput = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
});

const UpdateCategoryInput = z.object({
  id: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const ProviderInput = z.object({
  companyName: z.string().min(1),
  trade: z.string().min(1),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

const UpdateProviderInput = z.object({
  id: z.string(),
  companyName: z.string().optional(),
  trade: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  isActive: z.boolean().optional(),
});

const TeamInput = z.object({
  name: z.string().min(1),
  trade: z.string().min(1),
  contactName: z.string().optional(),
});

const UpdateTeamInput = z.object({
  id: z.string(),
  name: z.string().optional(),
  trade: z.string().optional(),
  contactName: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ──────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────

/** Verify a maintenance request exists in the user's tenant */
async function getTenantRequest(requestId: string, tenantId: string) {
  const [req] = await db
    .select()
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, requestId), eq(maintenanceRequests.tenantId, tenantId)));
  if (!req) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Maintenance request not found' });
  }
  return req;
}

/** Check admin has the 'requests' permission */
function requireRequestsPermission(role: string | null | undefined): void {
  if (!hasPermission(role, 'requests')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
}

/** Map changed fields on a request update to history entries */
async function trackRequestChanges(
  requestId: string,
  userId: string,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
) {
  const changes: Array<{
    id: string;
    requestId: string;
    userId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    createdAt: Date;
  }> = [];

  for (const [key, newVal] of Object.entries(newValues)) {
    if (newVal === undefined) continue;
    const oldVal = oldValues[key];
    const oldStr = oldVal != null ? String(oldVal) : null;
    const newStr = newVal != null ? String(newVal) : null;
    if (oldStr !== newStr) {
      changes.push({
        id: crypto.randomUUID(),
        requestId,
        userId,
        field: key,
        oldValue: oldStr,
        newValue: newStr,
        createdAt: new Date(),
      });
    }
  }

  if (changes.length > 0) {
    await db.insert(requestHistories).values(changes);
  }
}

// ──────────────────────────────────────────
// Router
// ──────────────────────────────────────────

export const maintenanceRouter = router({
  // ────────── REQUESTS ──────────

  listRequests: protectedProcedure.input(ListRequestsInput).query(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const canViewAll = hasPermission(ctx.role, 'requests');
    const scope = input?.scope || 'all';

    const rows = await listMaintenanceRequests({
      tenantId,
      userId: ctx.userId!,
      canViewAll,
      scope: scope === 'community' ? 'all' : scope,
      status: input?.status || null,
      priority: input?.priority || null,
      category: input?.category || null,
      dateFrom: input?.dateFrom || null,
      dateTo: input?.dateTo || null,
    });

    return toMaintenanceRequestViewList(rows, scope);
  }),

  getRequest: protectedProcedure.input(RequestIdInput).query(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const req = await getTenantRequest(input.id, tenantId);

    // Residents can only see their own requests unless they have requests permission
    if (!hasPermission(ctx.role, 'requests') && req.userId !== ctx.userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
    }

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, req.userId));

    let property = null;
    if (req.propertyId) {
      [property] = await db
        .select({ id: properties.id, street: properties.street, unit: properties.unit })
        .from(properties)
        .where(eq(properties.id, req.propertyId));
    }

    let team = null;
    if (req.assignedTeamId) {
      [team] = await db
        .select()
        .from(maintenanceTeams)
        .where(eq(maintenanceTeams.id, req.assignedTeamId));
    }

    let provider = null;
    if (req.assignedProviderId) {
      [provider] = await db
        .select()
        .from(serviceProviders)
        .where(eq(serviceProviders.id, req.assignedProviderId));
    }

    return {
      ...req,
      user,
      property,
      assignedTeam: team,
      assignedProvider: provider,
    };
  }),

  createRequest: protectedProcedure.input(CreateRequestInput).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const [created] = await createMaintenanceRequest({
      id: crypto.randomUUID(),
      tenantId,
      userId: ctx.userId!,
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

    revalidateDashboard();
    return created;
  }),

  updateRequest: protectedProcedure.input(UpdateRequestInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

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
      .where(eq(maintenanceRequests.id, input.id))
      .returning();

    await trackRequestChanges(input.id, ctx.userId!, existing, updateData);

    revalidateDashboard();
    return updated;
  }),

  deleteRequest: protectedProcedure.input(RequestIdInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    await getTenantRequest(input.id, tenantId);

    await db
      .update(maintenanceRequests)
      .set({ deletedAt: now() })
      .where(eq(maintenanceRequests.id, input.id));

    revalidateDashboard();
    return { success: true };
  }),

  // ────────── NOTES ──────────

  listNotes: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const req = await getTenantRequest(input.requestId, tenantId);

      // Residents can only see their own request's notes
      if (!hasPermission(ctx.role, 'requests') && req.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const conditions = [eq(requestNotes.requestId, input.requestId)];

      // Residents see only non-internal notes
      if (!hasPermission(ctx.role, 'requests')) {
        conditions.push(eq(requestNotes.isInternal, false));
      }

      const notes = await db
        .select({
          id: requestNotes.id,
          requestId: requestNotes.requestId,
          userId: requestNotes.userId,
          content: requestNotes.content,
          isInternal: requestNotes.isInternal,
          createdAt: requestNotes.createdAt,
          author: {
            name: users.name,
          },
        })
        .from(requestNotes)
        .leftJoin(users, eq(requestNotes.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(requestNotes.createdAt));

      return notes;
    }),

  createNote: protectedProcedure.input(CreateNoteInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    await getTenantRequest(input.requestId, tenantId);

    const [note] = await db
      .insert(requestNotes)
      .values({
        id: crypto.randomUUID(),
        requestId: input.requestId,
        userId: ctx.userId!,
        content: input.content,
        isInternal: input.isInternal,
        createdAt: new Date(),
      })
      .returning();

    revalidateDashboard();
    return note;
  }),

  // ────────── ASSIGNMENT ──────────

  assignRequest: protectedProcedure.input(AssignRequestInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

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
            isNull(maintenanceTeams.deletedAt)
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
            isNull(serviceProviders.deletedAt)
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

    await trackRequestChanges(input.requestId, ctx.userId!, existing, updateData);

    revalidateDashboard();
    return updated;
  }),

  // ────────── CATEGORIES ──────────

  listCategories: protectedProcedure
    .input(z.object({ isActive: z.boolean().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const conditions = [
        eq(maintenanceCategories.tenantId, tenantId),
        isNull(maintenanceCategories.deletedAt),
      ];

      if (input?.isActive !== undefined) {
        conditions.push(eq(maintenanceCategories.isActive, input.isActive));
      }

      return db
        .select()
        .from(maintenanceCategories)
        .where(and(...conditions))
        .orderBy(asc(maintenanceCategories.label));
    }),

  createCategory: protectedProcedure.input(CategoryInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    // Check for duplicate value
    const [existing] = await db
      .select()
      .from(maintenanceCategories)
      .where(
        and(
          eq(maintenanceCategories.tenantId, tenantId),
          eq(maintenanceCategories.value, input.value),
          isNull(maintenanceCategories.deletedAt)
        )
      );

    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Category value already exists' });
    }

    const [created] = await db
      .insert(maintenanceCategories)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        value: input.value,
        label: input.label,
        description: input.description || null,
        isActive: true,
        createdAt: new Date(),
      })
      .returning();

    return created;
  }),

  updateCategory: protectedProcedure.input(UpdateCategoryInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const [existing] = await db
      .select()
      .from(maintenanceCategories)
      .where(
        and(
          eq(maintenanceCategories.id, input.id),
          eq(maintenanceCategories.tenantId, tenantId),
          isNull(maintenanceCategories.deletedAt)
        )
      );

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
    }

    const updateData: Record<string, unknown> = {};
    if (input.label !== undefined) updateData.label = input.label;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updated] = await db
      .update(maintenanceCategories)
      .set(updateData)
      .where(eq(maintenanceCategories.id, input.id))
      .returning();

    return updated;
  }),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      requireRequestsPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [existing] = await db
        .select()
        .from(maintenanceCategories)
        .where(
          and(
            eq(maintenanceCategories.id, input.id),
            eq(maintenanceCategories.tenantId, tenantId),
            isNull(maintenanceCategories.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
      }

      await db
        .update(maintenanceCategories)
        .set({ deletedAt: new Date() })
        .where(eq(maintenanceCategories.id, input.id));

      return { success: true };
    }),

  // ────────── PROVIDERS ──────────

  listProviders: protectedProcedure
    .input(z.object({ isActive: z.boolean().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const conditions = [
        eq(serviceProviders.tenantId, tenantId),
        isNull(serviceProviders.deletedAt),
      ];

      if (input?.isActive !== undefined) {
        conditions.push(eq(serviceProviders.isActive, input.isActive));
      }

      return db
        .select()
        .from(serviceProviders)
        .where(and(...conditions))
        .orderBy(asc(serviceProviders.companyName));
    }),

  createProvider: protectedProcedure.input(ProviderInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const [created] = await db
      .insert(serviceProviders)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        companyName: input.companyName,
        trade: input.trade,
        contactName: input.contactName || null,
        phone: input.phone || null,
        email: input.email || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return created;
  }),

  updateProvider: protectedProcedure.input(UpdateProviderInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const [existing] = await db
      .select()
      .from(serviceProviders)
      .where(
        and(
          eq(serviceProviders.id, input.id),
          eq(serviceProviders.tenantId, tenantId),
          isNull(serviceProviders.deletedAt)
        )
      );

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.companyName !== undefined) updateData.companyName = input.companyName;
    if (input.trade !== undefined) updateData.trade = input.trade;
    if (input.contactName !== undefined) updateData.contactName = input.contactName;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updated] = await db
      .update(serviceProviders)
      .set(updateData)
      .where(eq(serviceProviders.id, input.id))
      .returning();

    return updated;
  }),

  deleteProvider: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      requireRequestsPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [existing] = await db
        .select()
        .from(serviceProviders)
        .where(
          and(
            eq(serviceProviders.id, input.id),
            eq(serviceProviders.tenantId, tenantId),
            isNull(serviceProviders.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
      }

      await db
        .update(serviceProviders)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(serviceProviders.id, input.id));

      return { success: true };
    }),

  // ────────── TEAMS ──────────

  listTeams: protectedProcedure
    .input(z.object({ isActive: z.boolean().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const conditions = [
        eq(maintenanceTeams.tenantId, tenantId),
        isNull(maintenanceTeams.deletedAt),
      ];

      if (input?.isActive !== undefined) {
        conditions.push(eq(maintenanceTeams.isActive, input.isActive));
      }

      return db
        .select()
        .from(maintenanceTeams)
        .where(and(...conditions))
        .orderBy(asc(maintenanceTeams.name));
    }),

  createTeam: protectedProcedure.input(TeamInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const [created] = await db
      .insert(maintenanceTeams)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        name: input.name,
        trade: input.trade,
        contactName: input.contactName || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return created;
  }),

  updateTeam: protectedProcedure.input(UpdateTeamInput).mutation(async ({ input, ctx }) => {
    requireRequestsPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const [existing] = await db
      .select()
      .from(maintenanceTeams)
      .where(
        and(
          eq(maintenanceTeams.id, input.id),
          eq(maintenanceTeams.tenantId, tenantId),
          isNull(maintenanceTeams.deletedAt)
        )
      );

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.trade !== undefined) updateData.trade = input.trade;
    if (input.contactName !== undefined) updateData.contactName = input.contactName;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updated] = await db
      .update(maintenanceTeams)
      .set(updateData)
      .where(eq(maintenanceTeams.id, input.id))
      .returning();

    return updated;
  }),

  deleteTeam: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      requireRequestsPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [existing] = await db
        .select()
        .from(maintenanceTeams)
        .where(
          and(
            eq(maintenanceTeams.id, input.id),
            eq(maintenanceTeams.tenantId, tenantId),
            isNull(maintenanceTeams.deletedAt)
          )
        );

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      await db
        .update(maintenanceTeams)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(maintenanceTeams.id, input.id));

      return { success: true };
    }),
});
