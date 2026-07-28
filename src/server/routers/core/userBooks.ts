import { z } from 'zod';
import {
  agentAccesses,
  albums,
  bookings,
  conversationParticipants,
  db,
  households,
  maintenanceRequests,
  notDeleted,
  notifications,
  now,
  platformSuspensions,
  premiumSeats,
  privilegedProcedure,
  profiles,
  properties,
  protectedProcedure,
  publicProcedure,
  router,
  soloSeats,
  standardSeats,
  tenantProcedure,
  toEnvelope,
  toEnvelopeSchema,
  users,
  writeAuditLog,
} from '@api/server';
import {
  propertyDto,
  userDto,
  profileDto,
  albumDto,
  seatDto,
  premiumSeatDto,
  standardSeatDto,
  agentAccessDto,
  suspensionDto,
} from '@api/server';

// Zod v4 DTOs (from drizzle-zod) are incompatible with Zod v3's ZodTypeAny constraint
// used by tRPC's output validation. Cast to any for output schema references.
// The runtime validation still uses the v4 DTOs via .parse() calls.

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';
import {
  eq,
  and,
  or,
  asc,
  desc,
  gt,
  ne,
  like,
  count,
  ilike,
  inArray,
  sql,
  InferSelectModel,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

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
