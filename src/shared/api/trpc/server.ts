import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { auth } from '@api/auth';
import { db, users, tenants } from '@api/db';
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

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.session.user.id,
      role: ctx.role as string,
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
