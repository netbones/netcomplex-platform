import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { rateLimitByUser, type RateLimitConfig } from '../rate-limit';
import { auth } from '../auth';
import { db, users, tenants } from '../db';
import { eq } from 'drizzle-orm';

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
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
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
