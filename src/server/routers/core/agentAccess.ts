import { z } from 'zod';
import {
  agentAccesses,
  protectedProcedure,
  router,
  tenantProcedure,
  toEnvelope,
  toEnvelopeSchema,
  agentAccessDto,
} from '@api/server';

// Zod v4 DTOs (from drizzle-zod) are incompatible with Zod v3's ZodTypeAny constraint
// used by tRPC's output validation. Cast to any for output schema references.
// The runtime validation still uses the v4 DTOs via .parse() calls.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const aaDto = agentAccessDto as any;

import { eq } from 'drizzle-orm';

export const agentAccessRouter = router({
  // ============ AGENT ACCESS ============

  /**
   * Get current user's agent accesses — user-scoped.
   * @tenant
   */
  getAgentAccesses: protectedProcedure
    .meta({
      openapi: { method: 'GET', path: '/my/agent-accesses', tags: ['Agent Access'], protect: true },
    })
    .output(toEnvelopeSchema(z.array(aaDto.passthrough())))
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select()
        .from(agentAccesses)
        .where(eq(agentAccesses.agentId, ctx.userId));
      return toEnvelope(rows);
    }),

  /**
   * Get agent accesses for a property — tenant-scoped.
   * @tenant
   */
  getPropertyAgentAccesses: tenantProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/properties/{propertyId}/agent-accesses',
        tags: ['Agent Access'],
      },
    })
    .input(z.object({ propertyId: z.string() }))
    .output(toEnvelopeSchema(z.array(aaDto.passthrough())))
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db
        .select()
        .from(agentAccesses)
        .where(eq(agentAccesses.propertyId, input.propertyId));
      return toEnvelope(rows);
    }),
});
