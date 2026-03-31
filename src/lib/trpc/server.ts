import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';

export interface Context {
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  prisma: typeof prisma;
  userId: string | null;
  role: Role | null;
  /** Organization ID for multi-tenancy / RLS scoping. Null in single-tenant mode. */
  organizationId: string | null;
}

export async function createContext(opts: { headers: Headers }): Promise<Context> {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  let role: Role | null = null;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    role = user?.role || null;
  }

  // organizationId: resolved from session metadata or env in multi-tenant mode.
  // Currently null (single-tenant). Populate from session.user.organizationId when
  // multi-tenancy is enabled.
  const organizationId: string | null =
    ((session?.user as Record<string, unknown> | undefined)?.organizationId as string | null) ??
    null;

  return {
    session,
    prisma,
    userId: session?.user?.id || null,
    role,
    organizationId,
  };
}

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
      role: ctx.role,
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
