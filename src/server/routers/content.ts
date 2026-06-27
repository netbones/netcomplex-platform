import { z } from 'zod';
import {
  router,
  publicProcedure,
  protectedProcedure,
  db,
  contents,
  contentLikes,
  users,
  groups,
  groupMembers,
  revalidateContent,
  notDeleted,
  emitEvent,
  now,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission, defaultLanguage, supportedLanguages } from '@shared/lib';

import { eq, and, or, desc, isNull, lte, gt, count, type SQL } from 'drizzle-orm';

import {
  listContent as entityListContent,
  createContent as entityCreateContent,
  resolveLocale,
  transformContentForLocale,
} from '@entities/content/server';

// ──────────────────────────────────────────
// Input Schemas
// ──────────────────────────────────────────

const IdInput = z.object({ id: z.string() });

const ListContentInput = z
  .object({
    category: z.string().optional(),
    published: z.string().optional(),
    featured: z.string().optional(),
    groupId: z.string().optional(),
    authorId: z.string().optional(),
    locale: z.string().optional(),
  })
  .optional();

const CategoryEnum = z.enum([
  'ANNOUNCEMENT',
  'NEWS',
  'EVENT',
  'BLOG',
  'CONSERVATION',
  'SERVICES',
  'CAMPAIGN',
]);

const LicenseEnum = z.enum(['CC0', 'CC_BY', 'CC_BY_SA', 'CC_BY_NC', 'ALL_RIGHTS_RESERVED']);

const ModerationEnum = z.enum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'FLAGGED']);

const LocaleRecord = z.record(z.string(), z.string());

const CreateContentInput = z.object({
  title: LocaleRecord,
  content: LocaleRecord,
  excerpt: LocaleRecord.optional(),
  category: CategoryEnum,
  groupId: z.string().optional().nullable(),
  tags: z.array(z.string()).max(10).default([]),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  defaultLocale: z.string().min(2).max(5).default(defaultLanguage),
  contentType: z.string().default('article'),
  publishedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  license: LicenseEnum.optional(),
  copyrightHolder: z.string().optional().nullable(),
  priority: z.string().optional(),
});

const UpdateContentInput = z.object({
  id: z.string(),
  title: z.union([z.string(), LocaleRecord]).optional(),
  content: z.union([z.string(), LocaleRecord]).optional(),
  excerpt: z.union([z.string(), LocaleRecord]).optional().nullable(),
  category: CategoryEnum.optional(),
  groupId: z.string().optional().nullable(),
  tags: z.array(z.string()).max(10).optional(),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
  defaultLocale: z.string().min(2).max(5).optional(),
  contentType: z.string().optional(),
  publishedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  license: LicenseEnum.optional(),
  copyrightHolder: z.string().optional().nullable(),
  priority: z.string().optional(),
});

const ModerateContentInput = z.object({
  id: z.string(),
  moderationStatus: ModerationEnum,
});

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

export function requireContentPermission(role: string | null | undefined): void {
  if (!hasPermission(role, 'content') && !hasPermission(role, 'contentOwn')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
}

export function requireFullContentPermission(role: string | null | undefined): void {
  if (!hasPermission(role, 'content')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
}

// ──────────────────────────────────────────
// Router
// ──────────────────────────────────────────

export const contentRouter = router({
  listContent: publicProcedure.input(ListContentInput).query(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    return entityListContent({
      tenantId,
      category: input?.category ?? null,
      published: input?.published ?? null,
      featured: input?.featured ?? null,
      groupId: input?.groupId ?? null,
      authorId: input?.authorId ?? null,
      locale: input?.locale ?? defaultLanguage,
    });
  }),

  getContent: publicProcedure
    .input(
      z.object({
        id: z.string(),
        locale: z.enum(supportedLanguages).optional(),
        published: z.coerce.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const userLocale = resolveLocale(input.locale);

      const conditions: (SQL<unknown> | undefined)[] = [
        notDeleted(contents),
        eq(contents.id, input.id),
        eq(contents.tenantId, tenantId),
      ];

      if (input.published !== undefined) {
        conditions.push(eq(contents.published, input.published));
      }

      const canViewAll = hasPermission(ctx.role, 'content');
      if (!canViewAll) {
        const ts = now();
        conditions.push(or(isNull(contents.publishedAt), lte(contents.publishedAt, ts)));
        conditions.push(or(isNull(contents.expiresAt), gt(contents.expiresAt, ts)));
      }

      const [content] = await db
        .select({
          id: contents.id,
          title: contents.title,
          content: contents.content,
          excerpt: contents.excerpt,
          image: contents.image,
          category: contents.category,
          tags: contents.tags,
          authorId: contents.authorId,
          groupId: contents.groupId,
          published: contents.published,
          featured: contents.featured,
          priority: contents.priority,
          defaultLocale: contents.defaultLocale,
          contentType: contents.contentType,
          license: contents.license,
          copyrightHolder: contents.copyrightHolder,
          moderationStatus: contents.moderationStatus,
          viewCount: contents.viewCount,
          createdAt: contents.createdAt,
          updatedAt: contents.updatedAt,
          publishedAt: contents.publishedAt,
          expiresAt: contents.expiresAt,
          authorName: users.name,
          groupName: groups.name,
        })
        .from(contents)
        .leftJoin(users, eq(contents.authorId, users.id))
        .leftJoin(groups, eq(contents.groupId, groups.id))
        .where(and(...conditions.filter((c): c is NonNullable<typeof c> => c !== undefined)))
        .limit(1);

      if (!content) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Content not found' });
      }

      const localized = transformContentForLocale(
        content as unknown as Record<string, unknown>,
        userLocale
      );

      return {
        ...localized,
        author: content.authorId ? { id: content.authorId, name: content.authorName ?? '' } : null,
        group: content.groupId ? { id: content.groupId, name: content.groupName ?? '' } : null,
      };
    }),

  createContent: protectedProcedure.input(CreateContentInput).mutation(async ({ input, ctx }) => {
    requireContentPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    if (input.groupId) {
      const [membership] = await db
        .select({ id: groupMembers.id })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.userId, ctx.userId!),
            eq(groupMembers.tenantId, tenantId),
            isNull(groupMembers.deletedAt)
          )
        )
        .limit(1);

      if (!membership && !hasPermission(ctx.role, 'admin')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this group' });
      }
    }

    const content = await entityCreateContent({
      tenantId,
      title: input.title,
      content: input.content,
      excerpt: input.excerpt ?? null,
      category: input.category,
      authorId: ctx.userId!,
      groupId: input.groupId ?? null,
      featured: input.featured,
      published: input.published,
      publishedAt: input.publishedAt ?? null,
      expiresAt: input.expiresAt ?? null,
      tags: input.tags,
      priority: input.priority ?? 'normal',
      defaultLocale: input.defaultLocale,
      contentType: input.contentType,
      license: input.license,
      copyrightHolder: input.copyrightHolder,
    });

    revalidateContent();

    emitEvent('content.created', {
      tenantId,
      userId: ctx.userId,
      contentId: content.id,
      category: content.category,
    });

    return content;
  }),

  updateContent: protectedProcedure.input(UpdateContentInput).mutation(async ({ input, ctx }) => {
    requireContentPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: now(),
    };

    if (input.title) {
      updateData.title =
        typeof input.title === 'string' ? { [defaultLanguage]: input.title } : input.title;
    }
    if (input.content) {
      updateData.content =
        typeof input.content === 'string' ? { [defaultLanguage]: input.content } : input.content;
    }
    if (input.excerpt !== undefined) {
      updateData.excerpt = input.excerpt
        ? typeof input.excerpt === 'string'
          ? { [defaultLanguage]: input.excerpt }
          : input.excerpt
        : null;
    }
    if (input.category) updateData.category = input.category;
    if (input.groupId !== undefined) updateData.groupId = input.groupId || null;
    if (input.featured !== undefined) updateData.featured = input.featured;
    if (input.published !== undefined) updateData.published = input.published;
    if (input.defaultLocale) updateData.defaultLocale = input.defaultLocale;
    if (input.contentType) updateData.contentType = input.contentType;
    if (input.tags) updateData.tags = input.tags;
    if (input.priority) updateData.priority = input.priority;
    if (input.license) updateData.license = input.license;
    if (input.copyrightHolder !== undefined)
      updateData.copyrightHolder = input.copyrightHolder || null;

    if (input.published && !input.publishedAt) {
      updateData.publishedAt = now();
    }
    if (input.publishedAt !== undefined) {
      updateData.publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
    }
    if (input.expiresAt !== undefined) {
      updateData.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    }

    const [existing] = await db
      .select({ deletedAt: contents.deletedAt })
      .from(contents)
      .where(and(eq(contents.id, input.id), eq(contents.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Content not found' });
    }

    if (existing.deletedAt) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'This content has been deleted' });
    }

    const [updated] = await db
      .update(contents)
      .set(updateData)
      .where(and(eq(contents.id, input.id), eq(contents.tenantId, tenantId)))
      .returning();

    revalidateContent();

    return updated;
  }),

  softDeleteContent: protectedProcedure.input(IdInput).mutation(async ({ input, ctx }) => {
    requireContentPermission(ctx.role);

    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    await db
      .update(contents)
      .set({ deletedAt: now(), updatedAt: now() })
      .where(and(eq(contents.id, input.id), eq(contents.tenantId, tenantId)));

    revalidateContent();

    return { success: true };
  }),

  moderateContent: protectedProcedure
    .input(ModerateContentInput)
    .mutation(async ({ input, ctx }) => {
      requireFullContentPermission(ctx.role);

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [existing] = await db
        .select({ id: contents.id })
        .from(contents)
        .where(and(eq(contents.id, input.id), eq(contents.tenantId, tenantId)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Content not found' });
      }

      await db
        .update(contents)
        .set({
          moderationStatus: input.moderationStatus,
          published: input.moderationStatus === 'PUBLISHED',
          updatedAt: now(),
        })
        .where(and(eq(contents.id, input.id), eq(contents.tenantId, tenantId)));

      revalidateContent();

      return { id: input.id, moderationStatus: input.moderationStatus };
    }),

  getLikes: publicProcedure.input(IdInput).query(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const [{ count: totalLikes }] = await db
      .select({ count: count() })
      .from(contentLikes)
      .where(and(eq(contentLikes.contentId, input.id), eq(contentLikes.tenantId, tenantId)));

    let liked = false;
    if (ctx.userId) {
      const [existing] = await db
        .select({ id: contentLikes.id })
        .from(contentLikes)
        .where(
          and(
            eq(contentLikes.contentId, input.id),
            eq(contentLikes.userId, ctx.userId),
            eq(contentLikes.tenantId, tenantId)
          )
        )
        .limit(1);
      liked = !!existing;
    }

    return { likes: totalLikes, liked };
  }),

  toggleLike: protectedProcedure.input(IdInput).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const [content] = await db
      .select({ id: contents.id })
      .from(contents)
      .where(
        and(eq(contents.id, input.id), eq(contents.tenantId, tenantId), isNull(contents.deletedAt))
      )
      .limit(1);

    if (!content) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Content not found' });
    }

    const [existing] = await db
      .select({ id: contentLikes.id })
      .from(contentLikes)
      .where(
        and(
          eq(contentLikes.contentId, input.id),
          eq(contentLikes.userId, ctx.userId),
          eq(contentLikes.tenantId, tenantId)
        )
      )
      .limit(1);

    if (existing) {
      await db.delete(contentLikes).where(eq(contentLikes.id, existing.id));
      return { liked: false };
    }

    await db.insert(contentLikes).values({
      id: crypto.randomUUID(),
      tenantId,
      contentId: input.id,
      userId: ctx.userId!,
      createdAt: now(),
    });

    return { liked: true };
  }),
});
