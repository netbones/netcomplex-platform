import { z } from 'zod';
import { router, protectedProcedure, rateLimitMiddleware, db, notifications } from '@api/server';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, inArray, isNull } from 'drizzle-orm';

// ──────────────────────────────────────────
// Output schemas
// ──────────────────────────────────────────

const notificationTypeEnum = z.enum(['info', 'warning', 'success', 'error']);

const notificationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  senderId: z.string().nullable(),
  title: z.string(),
  message: z.string(),
  type: notificationTypeEnum,
  category: z.string().nullable(),
  link: z.string().nullable(),
  read: z.boolean(),
  readAt: z.date().nullable(),
  deliveryStatus: z.string(),
  payload: z.unknown().nullable(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
});

// ──────────────────────────────────────────
// Router
// ──────────────────────────────────────────

export const notificationsRouter = router({
  // 1. List notifications for current user
  list: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/notifications',
        tags: ['Notifications'],
        summary: 'List notifications for current user',
        protect: true,
      },
    })
    .input(
      z
        .object({
          unread: z.boolean().optional(),
        })
        .optional()
    )
    .output(z.array(notificationSchema))
    .query(async ({ input, ctx }) => {
      const conditions = [
        eq(notifications.userId, ctx.userId),
        eq(notifications.tenantId, ctx.tenantId!),
        isNull(notifications.deletedAt),
      ];

      if (input?.unread) {
        conditions.push(eq(notifications.read, false));
      }

      return db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
    }),

  // 2. Create a notification
  create: protectedProcedure
    .use(rateLimitMiddleware({ windowMs: 60_000, maxRequests: 60 }))
    .meta({
      openapi: {
        method: 'POST',
        path: '/notifications',
        tags: ['Notifications'],
        summary: 'Create a notification',
        protect: true,
      },
    })
    .input(
      z.object({
        title: z.string().min(1),
        message: z.string().min(1),
        type: notificationTypeEnum.default('info'),
        category: z.string().optional(),
        link: z.string().optional(),
        senderId: z.string().optional(),
        payload: z.any().optional(),
        deliveryStatus: z.string().optional(),
      })
    )
    .output(notificationSchema)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const now = new Date();
      const [created] = await db
        .insert(notifications)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          userId: ctx.userId,
          title: input.title,
          message: input.message,
          type: input.type,
          category: input.category || null,
          link: input.link || null,
          senderId: input.senderId || null,
          payload: input.payload || null,
          deliveryStatus: input.deliveryStatus || 'PENDING',
          read: false,
          createdAt: now,
        })
        .returning();

      return created;
    }),

  // 3. Mark notification(s) as read
  markRead: protectedProcedure
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/notifications',
        tags: ['Notifications'],
        summary: 'Mark notification(s) as read',
        protect: true,
      },
    })
    .input(
      z
        .object({
          id: z.string().optional(),
          ids: z.array(z.string()).optional(),
        })
        .optional()
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const now = new Date();

      if (input?.id) {
        await db
          .update(notifications)
          .set({ read: true, readAt: now })
          .where(
            and(
              isNull(notifications.deletedAt),
              eq(notifications.id, input.id),
              eq(notifications.userId, ctx.userId),
              eq(notifications.tenantId, ctx.tenantId!)
            )
          );
      } else if (input?.ids && input.ids.length > 0) {
        await db
          .update(notifications)
          .set({ read: true, readAt: now })
          .where(
            and(
              isNull(notifications.deletedAt),
              inArray(notifications.id, input.ids),
              eq(notifications.userId, ctx.userId),
              eq(notifications.tenantId, ctx.tenantId!)
            )
          );
      } else {
        // Mark up to 500 unread as read
        const eligible = await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(
            and(
              isNull(notifications.deletedAt),
              eq(notifications.userId, ctx.userId),
              eq(notifications.tenantId, ctx.tenantId!),
              eq(notifications.read, false)
            )
          )
          .limit(500);

        if (eligible.length > 0) {
          await db
            .update(notifications)
            .set({ read: true, readAt: now })
            .where(
              inArray(
                notifications.id,
                eligible.map(n => n.id)
              )
            );
        }
      }

      return { success: true };
    }),

  // 4. Soft-delete a notification
  delete: protectedProcedure
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/notifications/{id}',
        tags: ['Notifications'],
        summary: 'Soft-delete a notification',
        protect: true,
      },
    })
    .input(z.object({ id: z.string() }))
    .output(z.object({ deleted: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const [notification] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.tenantId, ctx.tenantId!),
            eq(notifications.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!notification) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Notification not found' });
      }

      await db
        .update(notifications)
        .set({ deletedAt: new Date() })
        .where(eq(notifications.id, input.id));

      return { deleted: true };
    }),
});
