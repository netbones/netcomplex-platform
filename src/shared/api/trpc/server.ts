import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { rateLimitByUser, type RateLimitConfig } from '../rate-limit';
import { auth } from '../auth';
import { db, users, tenants, platformSuspensions } from '../db';
import { eq, and } from 'drizzle-orm';
import { tRPCCodeToCanonical } from '../envelope';

export interface Context {
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  db: typeof db;
  userId: string | null;
  role: string | null;
  /** Current tenant ID for multi-tenancy / RLS scoping. Null in single-tenant mode. */
  tenantId: string | null;
  tenantSlug: string | null;
  organizationId: string | null;
}

export async function createContext(opts: { headers: Headers }): Promise<Context> {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  const headersList = opts.headers;
  let tenantId: string | null = headersList.get('x-tenant-id');
  let tenantSlug: string | null = headersList.get('x-tenant-slug');

  let role: string | null = null;
  if (session?.user?.id) {
    const [user] = await db
      .select({ role: users.role, tenantId: users.tenantId })
      .from(users)
      .where(eq(users.id, session.user.id));
    role = user?.role || null;

    if (!tenantId && user?.tenantId) {
      tenantId = user.tenantId;
      const [tenant] = await db
        .select({ slug: tenants.slug })
        .from(tenants)
        .where(eq(tenants.id, tenantId));
      tenantSlug = tenant?.slug || null;
    }
  }

  const organizationId: string | null =
    ((session?.user as Record<string, unknown> | undefined)?.organizationId as string | null) ??
    null;

  return {
    session,
    db,
    userId: session?.user?.id || null,
    role,
    tenantId,
    tenantSlug,
    organizationId,
  };
}

// Main tRPC instance with superjson for internal use
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Determine canonical code — check for special message signals first
    let canonicalCode: string;
    if (error.message === 'SUSPENDED_USER') {
      canonicalCode = 'SUSPENDED_USER';
    } else if (error.message === 'FEATURE_DISABLED') {
      canonicalCode = 'FEATURE_DISABLED';
    } else {
      canonicalCode = tRPCCodeToCanonical(error.code);
    }

    return {
      ...shape,
      data: {
        ...shape.data,
        code: canonicalCode,
        httpStatus: shape.data.httpStatus,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export { rateLimitByUser };
export type { RateLimitConfig };

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  const userId = ctx.session.user.id;
  return next({
    ctx: {
      db: ctx.db,
      session: ctx.session,
      userId,
      role: (ctx.role ?? 'RESIDENT') as string,
      tenantId: ctx.tenantId,
      tenantSlug: ctx.tenantSlug,
      organizationId: ctx.organizationId,
    },
  });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.role !== 'ADMIN' && ctx.role !== 'BOARD') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const agentProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.role !== 'AGENT' && ctx.role !== 'ADMIN' && ctx.role !== 'BOARD') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Agent access required' });
  }
  return next({ ctx });
});

/**
 * Suspension check helper — queries platformSuspensions for active suspensions.
 * Auto-unsuspends expired timed suspensions before blocking.
 *
 * Used by privilegedProcedure (Step 4 of 5-step auth middleware).
 */
async function checkNotSuspended(ctx: { userId: string; tenantId: string | null; db: typeof db }) {
  // No-op when there's no user or tenant context
  if (!ctx.userId || !ctx.tenantId) return;

  const [activeSuspension] = await ctx.db
    .select({
      id: platformSuspensions.id,
      endDate: platformSuspensions.endDate,
    })
    .from(platformSuspensions)
    .where(
      and(
        eq(platformSuspensions.userId, ctx.userId),
        eq(platformSuspensions.tenantId, ctx.tenantId),
        eq(platformSuspensions.isActive, true)
      )
    )
    .limit(1);

  if (activeSuspension) {
    // Auto-unsuspend expired timed suspensions
    if (activeSuspension.endDate && new Date(activeSuspension.endDate) < new Date()) {
      await ctx.db
        .update(platformSuspensions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(platformSuspensions.id, activeSuspension.id));
      await ctx.db.update(users).set({ isActive: true }).where(eq(users.id, ctx.userId));
      return;
    }
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'SUSPENDED_USER',
    });
  }
}

/**
 * Tenant-scoped procedure — enforces non-null tenantId.
 * Extends protectedProcedure so authentication is already guaranteed.
 * Use for endpoints that MUST have tenant context (most tenant-domain operations).
 */
export const tenantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.tenantId) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Tenant context required',
    });
  }
  return next({ ctx: { ...ctx, tenantId: ctx.tenantId } });
});

/**
 * Privileged procedure — extends tenantProcedure with role and suspension checks.
 * Use for admin, board, committee, and staff endpoints.
 */
export const privilegedProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  if (ctx.role !== 'ADMIN' && ctx.role !== 'BOARD' && ctx.role !== 'COMMITTEE') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Privileged access required',
    });
  }
  // Step 4: Suspension check
  await checkNotSuspended(ctx);
  return next({ ctx });
});

export function rateLimitMiddleware(config: RateLimitConfig) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const result = await rateLimitByUser(ctx.userId, config);
    if (result) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please try again later.',
      });
    }
    return next({ ctx });
  });
}
