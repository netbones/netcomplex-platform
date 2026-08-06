import { z } from 'zod';
import {
  albums,
  notDeleted,
  now,
  router,
  tenantProcedure,
  toEnvelope,
  toEnvelopeSchema,
  users,
  albumDto,
} from '@api/server';

// Zod v4 DTOs (from drizzle-zod) are incompatible with Zod v3's ZodTypeAny constraint
// used by tRPC's output validation. Cast to any for output schema references.
// The runtime validation still uses the v4 DTOs via .parse() calls.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const aDto = albumDto as any;

import { TRPCError } from '@trpc/server';
import { eq, and, desc } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

export const albumsRouter = router({
  // ============ USER ALBUMS ============

  /**
   * List current user's albums — tenant-scoped.
   * @tenant
   */
  listAlbums: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/user/albums',
        tags: ['Identity'],
        summary: 'List current user albums',
        protect: true,
      },
    })
    .output(toEnvelopeSchema(z.object({ albums: z.array(aDto) })))
    .query(async ({ ctx }) => {
      const userAlbums = await ctx.db
        .select()
        .from(albums)
        .where(
          and(eq(albums.tenantId, ctx.tenantId), eq(albums.userId, ctx.userId), notDeleted(albums))
        )
        .orderBy(desc(albums.createdAt));

      return toEnvelope({ albums: userAlbums.map(a => albumDto.parse(a)) });
    }),

  /**
   * Get a single album — tenant-scoped.
   * @tenant
   */
  getAlbum: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/user/albums/{id}',
        tags: ['Identity'],
        summary: 'Get a single album',
        protect: true,
      },
    })
    .input(z.object({ id: z.string() }))
    .output(toEnvelopeSchema(aDto.nullable()))
    .query(async ({ input, ctx }) => {
      const [album] = await ctx.db
        .select()
        .from(albums)
        .where(
          and(
            eq(albums.id, input.id),
            eq(albums.tenantId, ctx.tenantId),
            eq(albums.userId, ctx.userId),
            notDeleted(albums)
          )
        )
        .limit(1);

      return toEnvelope(album ? albumDto.parse(album) : null);
    }),

  /**
   * Create an album — tenant-scoped.
   * @tenant
   */
  createAlbum: tenantProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/identity/user/albums',
        tags: ['Identity'],
        summary: 'Create an album',
        protect: true,
      },
    })
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        isPublic: z.boolean().default(false),
        mediaIds: z.array(z.string()).default([]),
      })
    )
    .output(toEnvelopeSchema(z.object({ albums: z.array(aDto) })))
    .mutation(async ({ input, ctx }) => {
      // Check album limit (max 3 per user)
      const existingAlbums = await ctx.db
        .select({ id: albums.id })
        .from(albums)
        .where(
          and(eq(albums.tenantId, ctx.tenantId), eq(albums.userId, ctx.userId), notDeleted(albums))
        );

      if (existingAlbums.length >= 3) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Maximum 3 albums allowed' });
      }

      const ts = now();
      await ctx.db
        .insert(albums)
        .values({
          id: createId(),
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          title: input.title,
          description: input.description || null,
          isPublic: input.isPublic,
          mediaIds: input.mediaIds,
          createdAt: ts,
          updatedAt: ts,
        })
        .returning();

      const allAlbums = await ctx.db
        .select()
        .from(albums)
        .where(
          and(eq(albums.tenantId, ctx.tenantId), eq(albums.userId, ctx.userId), notDeleted(albums))
        )
        .orderBy(desc(albums.createdAt));

      return toEnvelope({ albums: allAlbums.map(a => albumDto.parse(a)) });
    }),

  /**
   * Update an album — tenant-scoped.
   * @tenant
   */
  updateAlbum: tenantProcedure
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/identity/user/albums/{id}',
        tags: ['Identity'],
        summary: 'Update an album',
        protect: true,
      },
    })
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
        mediaIds: z.array(z.string()).optional(),
      })
    )
    .output(toEnvelopeSchema(z.object({ albums: z.array(aDto) })))
    .mutation(async ({ input, ctx }) => {
      const ts = now();
      const { id, ...data } = input;

      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description || null;
      if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
      if (data.mediaIds !== undefined) updateData.mediaIds = data.mediaIds;
      updateData.updatedAt = ts;

      await ctx.db
        .update(albums)
        .set(updateData)
        .where(
          and(
            eq(albums.id, id),
            eq(albums.tenantId, ctx.tenantId),
            eq(albums.userId, ctx.userId),
            notDeleted(albums)
          )
        );

      const allAlbums = await ctx.db
        .select()
        .from(albums)
        .where(
          and(eq(albums.tenantId, ctx.tenantId), eq(albums.userId, ctx.userId), notDeleted(albums))
        )
        .orderBy(desc(albums.createdAt));

      return toEnvelope({ albums: allAlbums.map(a => albumDto.parse(a)) });
    }),

  /**
   * Delete an album — tenant-scoped.
   * @tenant
   */
  deleteAlbum: tenantProcedure
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/identity/user/albums/{id}',
        tags: ['Identity'],
        summary: 'Delete an album',
        protect: true,
      },
    })
    .input(z.object({ id: z.string() }))
    .output(toEnvelopeSchema(z.object({ albums: z.array(aDto) })))
    .mutation(async ({ input, ctx }) => {
      const ts = now();

      await ctx.db
        .update(albums)
        .set({ deletedAt: ts, updatedAt: ts })
        .where(
          and(
            eq(albums.id, input.id),
            eq(albums.tenantId, ctx.tenantId),
            eq(albums.userId, ctx.userId),
            notDeleted(albums)
          )
        );

      const allAlbums = await ctx.db
        .select()
        .from(albums)
        .where(
          and(eq(albums.tenantId, ctx.tenantId), eq(albums.userId, ctx.userId), notDeleted(albums))
        )
        .orderBy(desc(albums.createdAt));

      return toEnvelope({ albums: allAlbums.map(a => albumDto.parse(a)) });
    }),

  /**
   * List public albums — tenant-scoped.
   * @tenant
   */
  listPublicAlbums: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/user/albums/public',
        tags: ['Identity'],
        summary: 'List public albums',
        protect: true,
      },
    })
    .output(toEnvelopeSchema(z.object({ albums: z.array(aDto.passthrough()) })))
    .query(async ({ ctx }) => {
      const publicAlbums = await ctx.db
        .select({
          id: albums.id,
          title: albums.title,
          description: albums.description,
          mediaIds: albums.mediaIds,
          createdAt: albums.createdAt,
          updatedAt: albums.updatedAt,
          userId: albums.userId,
          userName: users.name,
          userAvatar: users.avatar,
        })
        .from(albums)
        .innerJoin(users, eq(albums.userId, users.id))
        .where(
          and(eq(albums.tenantId, ctx.tenantId), eq(albums.isPublic, true), notDeleted(albums))
        )
        .orderBy(desc(albums.updatedAt));

      return toEnvelope({ albums: publicAlbums });
    }),
});
