import { z } from 'zod';
import {
  router,
  publicProcedure,
  protectedProcedure,
  tenantProcedure,
  privilegedProcedure,
  rateLimitMiddleware,
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
  announcements,
  revalidateDashboard,
  notifications,
  profiles,
  resources,
  settings,
  toEnvelope,
} from '@api/server';
import { contentDto, contentAuthorDto, announcementDto } from '@server/dto';

import { TRPCError } from '@trpc/server';
import {
  hasPermission,
  defaultLanguage,
  canPublishAnnouncements,
  supportedLanguages,
} from '@shared/lib';
import { validatePriorityForRole } from '@features/announcements';
import type { AnnouncementPriority } from '@features/announcements';

import { eq, and, or, desc, isNull, lte, gt, count, inArray, sql, type SQL } from 'drizzle-orm';

import { withTenantOptional, isModuleEnabled } from '@entities/tenant/server';

import {
  listContent as entityListContent,
  createContent as entityCreateContent,
  resolveLocale,
  transformContentForLocale,
} from '@entities/content/server';
import { createId } from '@shared/lib';
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

const TargetFilterEnum = z.enum(['ALL', 'OWNERS_ONLY', 'RENTERS_ONLY']);
const AnnouncementPriorityEnum = z.enum(['urgent', 'high', 'normal', 'low']);

const ListAnnouncementsInput = z
  .object({
    priority: AnnouncementPriorityEnum.optional(),
    active: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .optional();

const CreateAnnouncementInput = z.object({
  title: z.string().min(1).max(200).trim(),
  content: z.string().min(1).max(5000).trim(),
  author: z.string().min(1).max(100).trim(),
  priority: AnnouncementPriorityEnum.default('normal'),
  targetFilter: TargetFilterEnum.default('ALL'),
  targetRoles: z
    .array(
      z.enum([
        'RESIDENT',
        'GROUP_ADMIN',
        'COMMITTEE',
        'BOARD',
        'ADMIN',
        'AGENT',
        'MANAGER',
        'ASSOCIATE',
      ])
    )
    .default([]),
  resourceId: z.string().optional(),
  expiresAt: z.string().optional(),
});

const UpdateAnnouncementInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).trim().optional(),
  content: z.string().min(1).max(5000).trim().optional(),
  author: z.string().min(1).max(100).trim().optional(),
  priority: AnnouncementPriorityEnum.optional(),
  targetFilter: TargetFilterEnum.optional(),
  targetRoles: z
    .array(
      z.enum([
        'RESIDENT',
        'GROUP_ADMIN',
        'COMMITTEE',
        'BOARD',
        'ADMIN',
        'AGENT',
        'MANAGER',
        'ASSOCIATE',
      ])
    )
    .optional(),
  resourceId: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
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
  /**
   * List published content for the current tenant — public access.
   * @public
   */
  listContent: publicProcedure.input(ListContentInput).query(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
    }

    const userLocale = resolveLocale(input?.locale ?? defaultLanguage);
    const items = await entityListContent({
      tenantId,
      category: input?.category ?? null,
      published: input?.published ?? null,
      featured: input?.featured ?? null,
      groupId: input?.groupId ?? null,
      authorId: input?.authorId ?? null,
      locale: userLocale,
    });

    return toEnvelope(
      items.map(item => transformContentForLocale(item as Record<string, unknown>, userLocale))
    );
  }),

  /**
   * Get a single content item by ID — public access.
   * @public
   */
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

      return toEnvelope({
        ...localized,
        author: content.authorId ? { id: content.authorId, name: content.authorName ?? '' } : null,
        group: content.groupId ? { id: content.groupId, name: content.groupName ?? '' } : null,
      });
    }),

  /**
   * Create new content — staff only.
   * @privileged
   */
  createContent: privilegedProcedure
    .use(rateLimitMiddleware({ windowMs: 60_000, maxRequests: 5 }))
    .input(CreateContentInput)
    .mutation(async ({ input, ctx }) => {
      requireContentPermission(ctx.role);

      const tenantId = ctx.tenantId;

      if (input.groupId) {
        const [membership] = await db
          .select({ id: groupMembers.id })
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.groupId, input.groupId),
              eq(groupMembers.userId, ctx.userId),
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
        authorId: ctx.userId,
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

      return toEnvelope(contentDto.parse(content));
    }),

  /**
   * Update existing content — staff only.
   * @privileged
   */
  updateContent: privilegedProcedure.input(UpdateContentInput).mutation(async ({ input, ctx }) => {
    requireContentPermission(ctx.role);

    const tenantId = ctx.tenantId;

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

    return toEnvelope(contentDto.parse(updated));
  }),

  /**
   * Soft-delete content — staff only.
   * @privileged
   */
  softDeleteContent: privilegedProcedure.input(IdInput).mutation(async ({ input, ctx }) => {
    requireContentPermission(ctx.role);

    const tenantId = ctx.tenantId;

    await db
      .update(contents)
      .set({ deletedAt: now(), updatedAt: now() })
      .where(and(eq(contents.id, input.id), eq(contents.tenantId, tenantId)));

    revalidateContent();

    return toEnvelope({ success: true });
  }),

  /**
   * Moderate content — staff only (requires full content permission).
   * @privileged
   */
  moderateContent: privilegedProcedure
    .input(ModerateContentInput)
    .mutation(async ({ input, ctx }) => {
      requireFullContentPermission(ctx.role);

      const tenantId = ctx.tenantId;

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

      return toEnvelope({ id: input.id, moderationStatus: input.moderationStatus });
    }),

  /**
   * Get like count and user like status for content — public access.
   * @public
   */
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

    return toEnvelope({ likes: totalLikes, liked });
  }),

  /**
   * Toggle like on content — authenticated user action.
   * @tenant
   */
  toggleLike: tenantProcedure.input(IdInput).mutation(async ({ input, ctx }) => {
    const tenantId = ctx.tenantId;

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
      return toEnvelope({ liked: false });
    }

    await db.insert(contentLikes).values({
      id: createId(),
      tenantId,
      contentId: input.id,
      userId: ctx.userId,
      createdAt: now(),
    });

    return toEnvelope({ liked: true });
  }),

  // ────────── ANNOUNCEMENTS ──────────

  /**
   * List announcements for the current tenant.
   * @tenant
   */
  listAnnouncements: tenantProcedure
    .meta({
      openapi: { method: 'GET', path: '/announcements', protect: true, tags: ['content'] },
    })
    .input(ListAnnouncementsInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const priorityOrder = sql`CASE ${announcements.priority}
        WHEN 'urgent' THEN 0
        WHEN 'high' THEN 1
        WHEN 'normal' THEN 2
        WHEN 'low' THEN 3
        ELSE 4 END`;

      const conditions = [eq(announcements.tenantId, tenantId), isNull(announcements.deletedAt)];

      if (input?.priority) {
        conditions.push(eq(announcements.priority, input.priority));
      }

      if (input?.active === 'true') {
        conditions.push(
          sql`(${announcements.expiresAt} IS NULL OR ${announcements.expiresAt} > ${now()})`
        );
      }

      const limit = input?.limit ?? 50;

      const rows = await db
        .select()
        .from(announcements)
        .where(and(...conditions))
        .orderBy(priorityOrder, desc(announcements.createdAt))
        .limit(limit);
      return toEnvelope(rows.map(r => announcementDto.parse(r)));
    }),

  /**
   * Get a single announcement by ID.
   * @tenant
   */
  getAnnouncement: tenantProcedure
    .meta({
      openapi: { method: 'GET', path: '/announcements/{id}', protect: true, tags: ['content'] },
    })
    .input(IdInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [announcement] = await db
        .select()
        .from(announcements)
        .where(
          and(
            notDeleted(announcements),
            eq(announcements.id, input.id),
            eq(announcements.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!announcement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Announcement not found' });
      }

      return toEnvelope(announcementDto.parse(announcement));
    }),

  /**
   * Create an announcement — staff only.
   * @privileged
   */
  createAnnouncement: privilegedProcedure
    .meta({
      openapi: { method: 'POST', path: '/announcements', protect: true, tags: ['content'] },
    })
    .input(CreateAnnouncementInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      if (!canPublishAnnouncements(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to publish announcements',
        });
      }

      const validatedPriority = validatePriorityForRole(
        input.priority,
        ctx.role
      ) as AnnouncementPriority;
      const priorityDowngraded = validatedPriority !== input.priority;

      if (input.resourceId) {
        const [resource] = await db
          .select({ id: resources.id })
          .from(resources)
          .where(
            and(
              eq(resources.id, input.resourceId),
              eq(resources.tenantId, tenantId),
              isNull(resources.deletedAt)
            )
          )
          .limit(1);

        if (!resource) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Resource not found or does not belong to this tenant',
          });
        }
      }

      const ts = now();

      const [announcement] = await db
        .insert(announcements)
        .values({
          id: createId(),
          tenantId,
          title: input.title,
          content: input.content,
          author: input.author,
          priority: validatedPriority,
          targetFilter: input.targetFilter,
          targetRoles: input.targetRoles,
          resourceId: input.resourceId ?? null,
          createdAt: ts,
          updatedAt: ts,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        })
        .returning();

      let targetUsers: { id: string }[] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)));

      if (input.targetFilter === 'OWNERS_ONLY') {
        const ownerUserIds = await db
          .select({ id: users.id })
          .from(users)
          .innerJoin(profiles, eq(profiles.userId, users.id))
          .where(
            and(
              eq(users.tenantId, tenantId),
              eq(users.isActive, true),
              inArray(profiles.residencyType, ['OWNER', 'FAMILY'])
            )
          );
        targetUsers = ownerUserIds;
      } else if (input.targetFilter === 'RENTERS_ONLY') {
        const renterUserIds = await db
          .select({ id: users.id })
          .from(users)
          .innerJoin(profiles, eq(profiles.userId, users.id))
          .where(
            and(
              eq(users.tenantId, tenantId),
              eq(users.isActive, true),
              eq(profiles.residencyType, 'RENTER')
            )
          );
        targetUsers = renterUserIds;
      }

      if (input.targetRoles && input.targetRoles.length > 0) {
        const roleFilteredUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.tenantId, tenantId),
              eq(users.isActive, true),
              inArray(users.role, input.targetRoles)
            )
          );
        const roleIds = new Set(roleFilteredUsers.map(u => u.id));
        targetUsers = targetUsers.filter(u => roleIds.has(u.id));
      }

      const FANOUT_BATCH = 500;
      const MAX_FANOUT = 2000;
      if (targetUsers.length > MAX_FANOUT) {
        targetUsers = targetUsers.slice(0, MAX_FANOUT);
      }

      if (targetUsers.length > 0) {
        for (let i = 0; i < targetUsers.length; i += FANOUT_BATCH) {
          const batch = targetUsers.slice(i, i + FANOUT_BATCH);
          await db.insert(notifications).values(
            batch.map(user => ({
              id: createId(),
              tenantId,
              userId: user.id,
              title: announcement.title,
              message: announcement.content.slice(0, 200),
              type: 'info',
              link: `/news#announcement-${announcement.id}`,
              read: false,
            })) as (typeof notifications.$inferInsert)[]
          );
        }
      }

      revalidateDashboard();

      const parsed = announcementDto.parse(announcement) as Record<string, unknown>;
      if (priorityDowngraded) {
        parsed.warning = `Priority downgraded from ${input.priority} to ${validatedPriority} — your role permits a maximum of ${validatedPriority}`;
      }

      return toEnvelope(parsed);
    }),

  /**
   * Update an existing announcement — staff only.
   * @privileged
   */
  updateAnnouncement: privilegedProcedure
    .meta({
      openapi: { method: 'PATCH', path: '/announcements/{id}', protect: true, tags: ['content'] },
    })
    .input(UpdateAnnouncementInput)
    .mutation(async ({ input, ctx }) => {
      if (!canPublishAnnouncements(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to edit announcements',
        });
      }

      const tenantId = ctx.tenantId;
      let priorityDowngraded = false;
      let validatedPriority: AnnouncementPriority | undefined;

      if (input.priority) {
        validatedPriority = validatePriorityForRole(
          input.priority,
          ctx.role
        ) as AnnouncementPriority;
        priorityDowngraded = validatedPriority !== input.priority;
      }

      if (input.resourceId) {
        const [resource] = await db
          .select({ id: resources.id })
          .from(resources)
          .where(
            and(
              eq(resources.id, input.resourceId),
              eq(resources.tenantId, tenantId),
              isNull(resources.deletedAt)
            )
          )
          .limit(1);

        if (!resource) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Resource not found or does not belong to this tenant',
          });
        }
      }

      const updateData: Record<string, unknown> = {
        updatedAt: now(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.author !== undefined) updateData.author = input.author;
      if (validatedPriority !== undefined) updateData.priority = validatedPriority;
      else if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.targetFilter !== undefined) updateData.targetFilter = input.targetFilter;
      if (input.targetRoles !== undefined) updateData.targetRoles = input.targetRoles;
      if (input.resourceId !== undefined) updateData.resourceId = input.resourceId || null;
      if (input.expiresAt !== undefined) {
        updateData.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      }

      const [existing] = await db
        .select({ deletedAt: announcements.deletedAt })
        .from(announcements)
        .where(and(eq(announcements.id, input.id), eq(announcements.tenantId, tenantId)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Announcement not found' });
      }

      if (existing.deletedAt) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'This announcement has been deleted' });
      }

      const [announcement] = await db
        .update(announcements)
        .set(updateData)
        .where(and(eq(announcements.id, input.id), eq(announcements.tenantId, tenantId)))
        .returning();

      revalidateDashboard();

      const parsed = announcementDto.parse(announcement) as Record<string, unknown>;
      if (priorityDowngraded && validatedPriority) {
        parsed.warning = `Priority downgraded from ${input.priority} to ${validatedPriority} — your role permits a maximum of ${validatedPriority}`;
      }

      return toEnvelope(parsed);
    }),

  /**
   * Delete an announcement — staff only.
   * @privileged
   */
  deleteAnnouncement: privilegedProcedure
    .meta({
      openapi: { method: 'DELETE', path: '/announcements/{id}', protect: true, tags: ['content'] },
    })
    .input(IdInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      if (!canPublishAnnouncements(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to delete announcements',
        });
      }

      const [announcement] = await db
        .update(announcements)
        .set({ deletedAt: now(), updatedAt: now() })
        .where(and(eq(announcements.id, input.id), eq(announcements.tenantId, tenantId)))
        .returning();

      if (!announcement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Announcement not found' });
      }

      revalidateDashboard();

      return toEnvelope({ success: true });
    }),

  // ────────── CAMPAIGN PAGE ──────────

  /**
   * Get the campaign page configuration and content.
   * @tenant
   */
  getCampaignPage: tenantProcedure
    .meta({
      openapi: { method: 'GET', path: '/campaign', protect: true, tags: ['content'] },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;

      const tenantSettings = await db
        .select()
        .from(settings)
        .where(eq(settings.tenantId, tenantId));

      const settingsMap = tenantSettings.reduce(
        (acc, s) => {
          acc[s.key] = s.value;
          return acc;
        },
        {} as Record<string, string>
      );

      const DEFAULT_CAMPAIGN_CONFIG = {
        linkLabel: { en: 'Campaign', af: 'Veldtog', xh: 'Icampaign', zu: 'I-Campaign' },
        pageTitle: { en: 'Campaign', af: 'Veldtog', xh: 'Icampaign', zu: 'I-Campaign' },
        pageDescription: {
          en: 'Support our community campaign',
          af: 'Ondersteun ons gemeenskap se veldtog',
          xh: 'Uxhaso lomphefumlo wethu',
          zu: 'Sisekela umcamango weqembu lethu',
        },
        contentCategory: 'CAMPAIGN',
      };

      function safeParseSetting<T>(raw: string | undefined, fallback: T): T {
        if (!raw) return fallback;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return fallback;
        }
      }

      const campaignConfig = {
        linkLabel: safeParseSetting(
          settingsMap.campaignLinkLabel,
          DEFAULT_CAMPAIGN_CONFIG.linkLabel
        ),
        pageTitle: safeParseSetting(
          settingsMap.campaignPageTitle,
          DEFAULT_CAMPAIGN_CONFIG.pageTitle
        ),
        pageDescription: safeParseSetting(
          settingsMap.campaignPageDescription,
          DEFAULT_CAMPAIGN_CONFIG.pageDescription
        ),
        contentCategory: settingsMap.campaignCategory || DEFAULT_CAMPAIGN_CONFIG.contentCategory,
      };

      const campaignCategory =
        campaignConfig.contentCategory as (typeof contents.category.enumValues)[number];

      const contentList = await db
        .select({
          id: contents.id,
          title: contents.title,
          content: contents.content,
          excerpt: contents.excerpt,
          image: contents.image,
          category: contents.category,
          publishedAt: contents.publishedAt,
          featured: contents.featured,
          priority: contents.priority,
          defaultLocale: contents.defaultLocale,
          author: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(contents)
        .leftJoin(users, eq(contents.authorId, users.id))
        .where(
          and(
            eq(contents.published, true),
            eq(contents.category, campaignCategory),
            eq(contents.tenantId, tenantId)
          )
        )
        .orderBy(desc(contents.featured), desc(contents.priority), desc(contents.publishedAt));

      return toEnvelope({
        config: campaignConfig,
        content: contentList.map(c => contentDto.parse(c as Record<string, unknown>)),
      });
    }),

  // ────────── CONSERVATION PAGE ──────────

  /**
   * Get the conservation page content.
   * @tenant
   */
  getConservationPage: tenantProcedure
    .meta({
      openapi: { method: 'GET', path: '/conservation', protect: true, tags: ['content'] },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;

      const conservationEnabled = await isModuleEnabled(tenantId, 'conservation');
      if (!conservationEnabled) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Conservation feature is not available for this community',
        });
      }

      const contentList = await db
        .select({
          id: contents.id,
          title: contents.title,
          excerpt: contents.excerpt,
          image: contents.image,
          category: contents.category,
          publishedAt: contents.publishedAt,
          author: {
            name: users.name,
          },
        })
        .from(contents)
        .leftJoin(users, eq(contents.authorId, users.id))
        .where(and(eq(contents.published, true), eq(contents.tenantId, tenantId)))
        .orderBy(desc(contents.publishedAt))
        .limit(3);

      return toEnvelope(contentList.map(c => contentDto.parse(c as Record<string, unknown>)));
    }),
});
