import { z } from 'zod';
import {
  router,
  protectedProcedure,
  db,
  resources,
  resourceVersions,
  households,
  profiles,
  revalidateContent,
  notDeleted,
  now,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { hasPermission } from '@shared/lib';

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

async function checkUserOwnsProperty(userId: string, tenantId: string): Promise<boolean> {
  const result = await db
    .select({ id: households.id })
    .from(households)
    .innerJoin(profiles, eq(profiles.householdId, households.id))
    .where(and(eq(households.tenantId, tenantId), eq(profiles.userId, userId)))
    .limit(1);
  return result.length > 0;
}

function buildVisibilityFilter(role: string | null | undefined, isOwner: boolean = false) {
  if (hasPermission(role, 'admin') || role === 'MANAGER' || role === 'BOARD') {
    return undefined;
  }

  if (role === 'COMMITTEE') {
    return inArray(resources.visibility, ['ALL_RESIDENTS', 'OWNERS_ONLY', 'COMMITTEE_ONLY']);
  }

  if (role === 'RESIDENT' && isOwner) {
    return inArray(resources.visibility, ['ALL_RESIDENTS', 'OWNERS_ONLY']);
  }

  return eq(resources.visibility, 'ALL_RESIDENTS');
}

// ──────────────────────────────────────────
// Input schemas
// ──────────────────────────────────────────

const ResourceIdInput = z.object({ id: z.string() });

const VisibilityEnum = z.enum(['ALL_RESIDENTS', 'OWNERS_ONLY', 'COMMITTEE_ONLY', 'BOARD_ONLY']);

const ListResourcesInput = z
  .object({
    category: z.string().optional(),
    visibility: VisibilityEnum.optional(),
  })
  .optional();

const CreateResourceInput = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string(),
  fileUrl: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
  externalUrl: z.string().optional(),
  bodyContent: z.any().optional(),
  version: z.string().optional(),
  visibility: VisibilityEnum.default('ALL_RESIDENTS'),
  publishedAt: z.string().optional(),
});

const UpdateResourceInput = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  fileUrl: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
  externalUrl: z.string().optional(),
  bodyContent: z.any().optional(),
  version: z.string().optional(),
  versionNotes: z.string().optional(),
  visibility: VisibilityEnum.optional(),
  publishedAt: z.string().optional(),
});

// ──────────────────────────────────────────
// Router
// ──────────────────────────────────────────

export const resourcesRouter = router({
  listResources: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/resources',
        tags: ['Resources'],
        summary: 'List resources with visibility filtering',
        protect: true,
      },
    })
    .input(ListResourcesInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const role = ctx.role;
      let isOwner = false;
      if (ctx.userId) {
        isOwner = await checkUserOwnsProperty(ctx.userId, tenantId);
      }

      const visibilityFilter = buildVisibilityFilter(role, isOwner);

      let adminVisibilityFilter: ReturnType<typeof eq> | undefined;
      if (input?.visibility && hasPermission(role, 'content')) {
        adminVisibilityFilter = eq(
          resources.visibility,
          input.visibility as (typeof resources.visibility.enumValues)[number]
        );
      }

      const categoryFilter = input?.category
        ? eq(resources.category, input.category as (typeof resources.category.enumValues)[number])
        : undefined;

      const conditions = [eq(resources.tenantId, tenantId), notDeleted(resources)];
      if (visibilityFilter) conditions.push(visibilityFilter);
      if (adminVisibilityFilter) conditions.push(adminVisibilityFilter);
      if (categoryFilter) conditions.push(categoryFilter);

      return db
        .select()
        .from(resources)
        .where(and(...conditions))
        .orderBy(desc(resources.createdAt));
    }),

  getResource: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/resources/{id}',
        tags: ['Resources'],
        summary: 'Get a resource by ID',
        protect: true,
      },
    })
    .input(ResourceIdInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [item] = await db
        .select()
        .from(resources)
        .where(
          and(notDeleted(resources), eq(resources.id, input.id), eq(resources.tenantId, tenantId))
        );

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' });
      }

      const role = ctx.role;
      const visibility = item.visibility;

      let isOwner = false;
      if (ctx.userId) {
        isOwner = await checkUserOwnsProperty(ctx.userId, tenantId);
      }

      if (hasPermission(role, 'admin') || role === 'MANAGER' || role === 'BOARD') {
        // Full access
      } else if (role === 'COMMITTEE' && visibility === 'BOARD_ONLY') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      } else if (role === 'RESIDENT' && isOwner) {
        if (visibility === 'BOARD_ONLY' || visibility === 'COMMITTEE_ONLY') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      } else if (visibility !== 'ALL_RESIDENTS') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const versions = await db
        .select()
        .from(resourceVersions)
        .where(eq(resourceVersions.resourceId, input.id))
        .orderBy(desc(resourceVersions.createdAt));

      return { ...item, versions };
    }),

  createResource: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/resources',
        tags: ['Resources'],
        summary: 'Create a resource',
        protect: true,
      },
    })
    .input(CreateResourceInput)
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role, 'content')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Content permission required' });
      }

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const ts = now();

      const [resource] = await db
        .insert(resources)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          title: input.title,
          description: input.description || null,
          category: input.category as (typeof resources.category.enumValues)[number],
          fileUrl: input.fileUrl || null,
          fileType: input.fileType || null,
          fileSize: input.fileSize ?? null,
          externalUrl: input.externalUrl || null,
          bodyContent: input.bodyContent || null,
          version: input.version || null,
          visibility: input.visibility as (typeof resources.visibility.enumValues)[number],
          authorId: ctx.userId,
          publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
          createdAt: ts,
          updatedAt: ts,
        })
        .returning();

      revalidateContent();

      return resource;
    }),

  updateResource: protectedProcedure
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/resources/{id}',
        tags: ['Resources'],
        summary: 'Update a resource',
        protect: true,
      },
    })
    .input(UpdateResourceInput)
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role, 'content')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Content permission required' });
      }

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [existing] = await db
        .select()
        .from(resources)
        .where(and(eq(resources.id, input.id), eq(resources.tenantId, tenantId)));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' });
      }

      if (existing.deletedAt) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource has been deleted' });
      }

      if (input.fileUrl || input.version) {
        const oldFileUrl = input.fileUrl ? existing.fileUrl : undefined;
        const oldVersion = input.version ? existing.version : undefined;
        if (oldFileUrl || oldVersion) {
          await db.insert(resourceVersions).values({
            id: crypto.randomUUID(),
            resourceId: input.id,
            fileUrl: oldFileUrl,
            fileType: input.fileUrl ? existing.fileType : undefined,
            fileSize: input.fileUrl ? existing.fileSize : undefined,
            version: oldVersion,
            notes: input.versionNotes || null,
            createdAt: now(),
          });
        }
      }

      const updateData: Record<string, unknown> = { updatedAt: now() };
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.fileUrl !== undefined) updateData.fileUrl = input.fileUrl;
      if (input.fileType !== undefined) updateData.fileType = input.fileType;
      if (input.fileSize !== undefined) updateData.fileSize = input.fileSize;
      if (input.externalUrl !== undefined) updateData.externalUrl = input.externalUrl;
      if (input.bodyContent !== undefined) updateData.bodyContent = input.bodyContent;
      if (input.version !== undefined) updateData.version = input.version;
      if (input.visibility !== undefined) updateData.visibility = input.visibility;
      if (input.publishedAt !== undefined) updateData.publishedAt = new Date(input.publishedAt);

      const [updated] = await db
        .update(resources)
        .set(updateData)
        .where(eq(resources.id, input.id))
        .returning();

      revalidateContent();

      return updated;
    }),

  deleteResource: protectedProcedure
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/resources/{id}',
        tags: ['Resources'],
        summary: 'Delete a resource (soft-delete)',
        protect: true,
      },
    })
    .input(ResourceIdInput)
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin permission required' });
      }

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [existing] = await db
        .select({ id: resources.id })
        .from(resources)
        .where(and(eq(resources.id, input.id), eq(resources.tenantId, tenantId)));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' });
      }

      const ts = now();
      await db
        .update(resources)
        .set({ deletedAt: ts, updatedAt: ts })
        .where(eq(resources.id, input.id));

      revalidateContent();

      return { success: true };
    }),

  incrementDownloadCount: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/resources/{id}/download',
        tags: ['Resources'],
        summary: 'Increment resource download count',
        protect: true,
      },
    })
    .input(ResourceIdInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [updated] = await db
        .update(resources)
        .set({
          downloadCount: sql`${resources.downloadCount} + 1`,
          updatedAt: now(),
        })
        .where(and(eq(resources.id, input.id), eq(resources.tenantId, tenantId)))
        .returning({ downloadCount: resources.downloadCount });

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' });
      }

      return { downloadCount: updated.downloadCount };
    }),
});
