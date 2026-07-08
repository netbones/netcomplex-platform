import { z } from 'zod';
import {
  router,
  tenantProcedure,
  privilegedProcedure,
  db,
  groups,
  groupMembers,
  users,
  contents,
  revalidateDirectory,
  notDeleted,
  now,
  emitEvent,
} from '@api/server';

import { toEnvelope } from '@api/server';

import { groupDto, groupDetailDto } from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';

import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

// ──────────────────────────────────────────
// Input schemas
// ──────────────────────────────────────────

const IdInput = z.object({ id: z.string() });

const ListGroupsInput = z
  .object({
    category: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
  })
  .optional();

const CreateGroupInput = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.string().min(1),
  image: z.string().optional(),
  color: z.string().optional(),
  isPublic: z.boolean().optional().default(true),
  accessType: z.enum(['OPEN', 'INVITE_ONLY', 'APPLICATION']).optional().default('OPEN'),
  residentFilter: z.enum(['ALL', 'OWNERS_ONLY', 'RENTERS_ONLY']).optional().default('ALL'),
  ownerId: z.string().optional(),
});

const UpdateGroupInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  image: z.string().optional().nullable(),
  color: z.string().optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
  accessType: z.enum(['OPEN', 'INVITE_ONLY', 'APPLICATION']).optional(),
  residentFilter: z.enum(['ALL', 'OWNERS_ONLY', 'RENTERS_ONLY']).optional(),
});

const JoinLeaveInput = z.object({
  groupId: z.string(),
});

const UpdateMemberRoleInput = z.object({
  groupId: z.string(),
  userId: z.string(),
  role: z.enum(['MEMBER', 'MODERATOR', 'ADMIN']),
});

const RemoveMemberInput = z.object({
  groupId: z.string(),
  userId: z.string(),
});

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

async function getTenantGroup(groupId: string, tenantId: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.tenantId, tenantId), notDeleted(groups)));
  if (!group) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
  }
  return group;
}

function requireGroupsPermission(role: string | null | undefined): void {
  if (!hasPermission(role, 'groups') && !hasPermission(role, 'groupsOwn')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
}

function requireFullGroupsPermission(role: string | null | undefined): void {
  if (!hasPermission(role, 'groups')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
}

async function isGroupMember(userId: string, groupId: string, tenantId: string): Promise<boolean> {
  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.userId, userId),
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.tenantId, tenantId),
        notDeleted(groupMembers)
      )
    )
    .limit(1);
  return !!membership;
}

// ──────────────────────────────────────────
// Router
// ──────────────────────────────────────────

export const groupsRouter = router({
  // ────────── GROUPS ──────────

  /**
   * List groups for the current tenant.
   * @tenant
   */
  listGroups: tenantProcedure
    .meta({ openapi: { method: 'GET', path: '/groups', protect: true, tags: ['groups'] } })
    .input(ListGroupsInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const conditions = [notDeleted(groups), eq(groups.tenantId, tenantId)];

      if (input?.category) {
        conditions.push(eq(groups.category, input.category));
      }
      if (input?.isActive !== undefined) {
        conditions.push(eq(groups.isActive, input.isActive));
      }

      const groupList = await db
        .select({
          id: groups.id,
          name: groups.name,
          description: groups.description,
          category: groups.category,
          image: groups.image,
          color: groups.color,
          isPublic: groups.isPublic,
          accessType: groups.accessType,
          residentFilter: groups.residentFilter,
          isActive: groups.isActive,
          createdAt: groups.createdAt,
          updatedAt: groups.updatedAt,
          ownerId: groups.ownerId,
          ownerName: users.name,
        })
        .from(groups)
        .leftJoin(users, eq(groups.ownerId, users.id))
        .where(and(...conditions))
        .orderBy(asc(groups.name));

      const groupIds = groupList.map(g => g.id);

      const memberCounts =
        groupIds.length > 0
          ? await db
              .select({
                groupId: groupMembers.groupId,
                count: sql<number>`count(*)::int`,
              })
              .from(groupMembers)
              .where(
                and(
                  eq(groupMembers.tenantId, tenantId),
                  notDeleted(groupMembers),
                  inArray(groupMembers.groupId, groupIds)
                )
              )
              .groupBy(groupMembers.groupId)
          : [];

      const countByGroupId = new Map(memberCounts.map(r => [r.groupId, r.count]));

      return toEnvelope(
        groupList.map(group =>
          groupDto.parse({
            ...group,
            owner: { id: group.ownerId, name: group.ownerName ?? 'Unknown' },
            _count: { members: countByGroupId.get(group.id) ?? 0 },
          })
        )
      );
    }),

  /**
   * Get a single group with members and content.
   * @tenant
   */
  getGroup: tenantProcedure
    .meta({ openapi: { method: 'GET', path: '/groups/{id}', protect: true, tags: ['groups'] } })
    .input(IdInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      const group = await getTenantGroup(input.id, tenantId);

      const [ownerResult, membersList, contentList] = await Promise.all([
        db
          .select({ id: users.id, name: users.name, image: users.image })
          .from(users)
          .where(eq(users.id, group.ownerId))
          .limit(1),
        db
          .select({
            id: groupMembers.id,
            userId: groupMembers.userId,
            groupId: groupMembers.groupId,
            role: groupMembers.role,
            joinedAt: groupMembers.joinedAt,
          })
          .from(groupMembers)
          .where(
            and(
              notDeleted(groupMembers),
              eq(groupMembers.groupId, input.id),
              eq(groupMembers.tenantId, tenantId)
            )
          ),
        db
          .select({
            id: contents.id,
            title: contents.title,
            excerpt: contents.excerpt,
            category: contents.category,
            authorId: contents.authorId,
            groupId: contents.groupId,
            published: contents.published,
            featured: contents.featured,
            priority: contents.priority,
            createdAt: contents.createdAt,
            updatedAt: contents.updatedAt,
            publishedAt: contents.publishedAt,
          })
          .from(contents)
          .where(eq(contents.groupId, input.id))
          .orderBy(desc(contents.publishedAt))
          .limit(10),
      ]);

      const owner = ownerResult[0] ?? null;

      const memberUserIds = membersList.map(m => m.userId);
      const memberUsers =
        memberUserIds.length > 0
          ? await db
              .select({ id: users.id, name: users.name, image: users.image })
              .from(users)
              .where(inArray(users.id, memberUserIds))
          : [];
      const userById = new Map(memberUsers.map(u => [u.id, u]));

      const membersWithUsers = membersList.map(member => ({
        ...member,
        user: userById.get(member.userId) ?? null,
      }));

      return toEnvelope(
        groupDetailDto.parse({
          ...group,
          owner: owner ? { id: owner.id, name: owner.name, image: owner.image } : null,
          members: membersWithUsers,
          contents: contentList,
        })
      );
    }),

  /**
   * Create a new group — staff only.
   * @privileged
   */
  createGroup: privilegedProcedure
    .meta({ openapi: { method: 'POST', path: '/groups', protect: true, tags: ['groups'] } })
    .input(CreateGroupInput)
    .mutation(async ({ input, ctx }) => {
      requireGroupsPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const ts = now();

      const [group] = await db
        .insert(groups)
        .values({
          id: createId(),
          tenantId,
          name: input.name,
          description: input.description || null,
          category: input.category,
          image: input.image || null,
          color: input.color || '#4F46E5',
          isPublic: input.isPublic,
          accessType: input.accessType,
          residentFilter: input.residentFilter,
          isActive: true,
          ownerId: input.ownerId || ctx.userId,
          createdAt: ts,
          updatedAt: ts,
        })
        .returning();

      await db.insert(groupMembers).values({
        id: createId(),
        tenantId,
        userId: input.ownerId || ctx.userId,
        groupId: group.id,
        role: 'ADMIN',
        joinedAt: ts,
      });

      emitEvent('group.joined', {
        tenantId,
        userId: ctx.userId,
        groupId: group.id,
      });

      revalidateDirectory();
      return toEnvelope(groupDto.parse(group));
    }),

  /**
   * Update an existing group — staff only.
   * @privileged
   */
  updateGroup: privilegedProcedure
    .meta({ openapi: { method: 'PATCH', path: '/groups/{id}', protect: true, tags: ['groups'] } })
    .input(UpdateGroupInput)
    .mutation(async ({ input, ctx }) => {
      requireGroupsPermission(ctx.role);

      const tenantId = ctx.tenantId;

      await getTenantGroup(input.id, tenantId);

      const updateData: Record<string, unknown> = { updatedAt: now() };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description || null;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.image !== undefined) updateData.image = input.image;
      if (input.color !== undefined) updateData.color = input.color;
      if (input.isPublic !== undefined) updateData.isPublic = input.isPublic;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.accessType !== undefined) updateData.accessType = input.accessType;
      if (input.residentFilter !== undefined) updateData.residentFilter = input.residentFilter;

      const [updated] = await db
        .update(groups)
        .set(updateData)
        .where(and(eq(groups.id, input.id), eq(groups.tenantId, tenantId)))
        .returning();

      revalidateDirectory();
      return toEnvelope(groupDto.parse(updated));
    }),

  /**
   * Soft-delete a group — staff only.
   * @privileged
   */
  deleteGroup: privilegedProcedure
    .meta({ openapi: { method: 'DELETE', path: '/groups/{id}', protect: true, tags: ['groups'] } })
    .input(IdInput)
    .mutation(async ({ input, ctx }) => {
      requireGroupsPermission(ctx.role);

      const tenantId = ctx.tenantId;

      await getTenantGroup(input.id, tenantId);

      await db
        .update(groups)
        .set({ deletedAt: now(), updatedAt: now() })
        .where(and(eq(groups.id, input.id), eq(groups.tenantId, tenantId)));

      revalidateDirectory();
      return toEnvelope({ success: true });
    }),

  // ────────── MEMBERSHIP ──────────

  /**
   * Join an open group — authenticated user action.
   * @tenant
   */
  joinGroup: tenantProcedure
    .meta({
      openapi: { method: 'POST', path: '/groups/{groupId}/join', protect: true, tags: ['groups'] },
    })
    .input(JoinLeaveInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const group = await getTenantGroup(input.groupId, tenantId);

      if (group.accessType !== 'OPEN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This group is not open for direct joining',
        });
      }

      const existing = await isGroupMember(ctx.userId, input.groupId, tenantId);
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Already a member of this group' });
      }

      const [membership] = await db
        .insert(groupMembers)
        .values({
          id: createId(),
          tenantId,
          userId: ctx.userId,
          groupId: input.groupId,
          role: 'MEMBER',
          joinedAt: now(),
        })
        .returning();

      return toEnvelope(membership);
    }),

  /**
   * Leave a group — authenticated user action.
   * @tenant
   */
  leaveGroup: tenantProcedure
    .meta({
      openapi: { method: 'POST', path: '/groups/{groupId}/leave', protect: true, tags: ['groups'] },
    })
    .input(JoinLeaveInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const existing = await isGroupMember(ctx.userId, input.groupId, tenantId);
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Not a member of this group' });
      }

      await db
        .update(groupMembers)
        .set({ deletedAt: now() })
        .where(
          and(
            eq(groupMembers.userId, ctx.userId),
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.tenantId, tenantId)
          )
        );

      return toEnvelope({ success: true });
    }),

  /**
   * List members of a group.
   * @tenant
   */
  listMembers: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/groups/{groupId}/members',
        protect: true,
        tags: ['groups'],
      },
    })
    .input(JoinLeaveInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const membersList = await db
        .select({
          id: groupMembers.id,
          userId: groupMembers.userId,
          groupId: groupMembers.groupId,
          role: groupMembers.role,
          joinedAt: groupMembers.joinedAt,
        })
        .from(groupMembers)
        .where(
          and(
            notDeleted(groupMembers),
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.tenantId, tenantId)
          )
        )
        .orderBy(asc(groupMembers.joinedAt));

      const memberUserIds = membersList.map(m => m.userId);
      const memberUsers =
        memberUserIds.length > 0
          ? await db
              .select({ id: users.id, name: users.name, image: users.image })
              .from(users)
              .where(inArray(users.id, memberUserIds))
          : [];
      const userById = new Map(memberUsers.map(u => [u.id, u]));

      return toEnvelope(
        membersList.map(member => ({
          ...member,
          user: userById.get(member.userId) ?? null,
        }))
      );
    }),

  /**
   * Update a member's role — staff only.
   * @privileged
   */
  updateMemberRole: privilegedProcedure
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/groups/{groupId}/members/{userId}',
        protect: true,
        tags: ['groups'],
      },
    })
    .input(UpdateMemberRoleInput)
    .mutation(async ({ input, ctx }) => {
      requireFullGroupsPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.userId, input.userId),
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.tenantId, tenantId),
            notDeleted(groupMembers)
          )
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
      }

      const [updated] = await db
        .update(groupMembers)
        .set({ role: input.role })
        .where(eq(groupMembers.id, membership.id))
        .returning();

      return toEnvelope(updated);
    }),

  /**
   * Remove a member from a group — staff only.
   * @privileged
   */
  removeMember: privilegedProcedure
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/groups/{groupId}/members/{userId}',
        protect: true,
        tags: ['groups'],
      },
    })
    .input(RemoveMemberInput)
    .mutation(async ({ input, ctx }) => {
      requireFullGroupsPermission(ctx.role);

      const tenantId = ctx.tenantId;

      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.userId, input.userId),
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.tenantId, tenantId),
            notDeleted(groupMembers)
          )
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
      }

      await db
        .update(groupMembers)
        .set({ deletedAt: now() })
        .where(eq(groupMembers.id, membership.id));

      return toEnvelope({ success: true });
    }),
});
