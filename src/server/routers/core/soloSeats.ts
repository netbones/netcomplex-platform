import { z } from 'zod';
import {
  protectedProcedure,
  properties,
  router,
  soloSeats,
  toEnvelope,
  toEnvelopeSchema,
  propertyDto,
} from '@api/server';

// Zod v4 DTOs (from drizzle-zod) are incompatible with Zod v3's ZodTypeAny constraint
// used by tRPC's output validation. Cast to any for output schema references.
// The runtime validation still uses the v4 DTOs via .parse() calls.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pDto = propertyDto as any;

import { eq } from 'drizzle-orm';

export const soloSeatsRouter = router({
  // ============ SOLO SEATS ============

  /**
   * Get current user's solo seat — user-scoped.
   * @tenant
   */
  getMySoloSeat: protectedProcedure
    .meta({
      openapi: { method: 'GET', path: '/my/solo-seat', tags: ['Solo Seats'], protect: true },
    })
    .output(
      toEnvelopeSchema(
        z
          .object({
            id: z.string(),
            tenantId: z.string(),
            userId: z.string(),
            platformAddress: z.string(),
            propertyId: z.string().nullable(),
            seatType: z.string(),
            isComplimentary: z.boolean(),
            linkedFromProfileId: z.string().nullable(),
            organizationId: z.string().nullable(),
            createdAt: z.date(),
            updatedAt: z.date(),
            property: pDto.nullable(),
          })
          .nullable()
      )
    )
    .query(async ({ ctx }) => {
      const [seat] = await ctx.db.select().from(soloSeats).where(eq(soloSeats.userId, ctx.userId));
      if (!seat) return toEnvelope(null);

      const property = seat.propertyId
        ? await ctx.db
            .select()
            .from(properties)
            .where(eq(properties.id, seat.propertyId))
            .then(r => r[0])
        : null;

      return toEnvelope({ ...seat, property });
    }),
});
