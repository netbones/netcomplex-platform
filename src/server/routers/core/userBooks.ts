import { z } from 'zod';
import { router, tenantProcedure, toEnvelope, toEnvelopeSchema, users } from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';
import { eq, and } from 'drizzle-orm';

export const userBooksRouter = router({
  // ============ USER BOOKS ============

  /**
   * List books for a user — tenant-scoped.
   * @tenant
   */
  listUserBooks: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/identity/users/{id}/books',
        tags: ['Identity'],
        summary: 'List books for a user',
        protect: true,
      },
    })
    .input(z.object({ userId: z.string() }))
    .output(
      toEnvelopeSchema(
        z.object({
          books: z.array(z.unknown()),
        })
      )
    )
    .query(async ({ input, ctx }) => {
      const isOwnerOrAdmin = ctx.userId === input.userId || hasPermission(ctx.role, 'admin');
      if (!isOwnerOrAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const userResult = await ctx.db
        .select({ books: users.books })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, ctx.tenantId)))
        .limit(1);

      const books = userResult[0]
        ? Array.isArray(userResult[0].books)
          ? userResult[0].books
          : []
        : [];
      return toEnvelope({ books });
    }),
});
