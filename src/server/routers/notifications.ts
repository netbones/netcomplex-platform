import { z } from 'zod';
import {
  router,
  protectedProcedure,
  privilegedProcedure,
  rateLimitMiddleware,
  db,
  notifications,
} from '@api/server';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, inArray, isNull } from 'drizzle-orm';
import { toEnvelope } from '@api/server';
import { notificationDto } from '@server/dto';

const notificationTypeEnum = z.enum(['info', 'warning', 'success', 'error']);

export const notificationsRouter = router({
  /**
   * List notifications for the current user.
   * @tenant
   */
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
    .output(z.object({ success: z.literal(true), data: z.array(notificationDto) }))
    .query(async ({ input, ctx }) => {
      const conditions = [
        eq(notifications.userId, ctx.userId),
        eq(notifications.tenantId, ctx.tenantId!),
        isNull(notifications.deletedAt),
      ];

      if (input?.unread) {
        conditions.push(eq(notifications.read, false));
      }

      const rows = await db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(50);

      return toEnvelope(rows.map(r => notificationDto.parse(r)));
    }),

  /**
   * Create a new notification — staff only.
   * @privileged
   */
  create: privilegedProcedure
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
    .output(z.object({ success: z.literal(true), data: notificationDto }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

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

      return toEnvelope(notificationDto.parse(created));
    }),

  /**
   * Mark notification(s) as read for the current user.
   * @tenant
   */
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
    .output(z.object({ success: z.literal(true), data: z.object({ success: z.boolean() }) }))
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

      return toEnvelope({ success: true });
    }),

  /**
   * Soft-delete a notification for the current user.
   * @tenant
   */
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
    .output(z.object({ success: z.literal(true), data: z.object({ deleted: z.boolean() }) }))
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

      return toEnvelope({ deleted: true });
    }),
});
