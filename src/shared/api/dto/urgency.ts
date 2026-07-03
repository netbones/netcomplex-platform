import { z } from 'zod/v4';

export const urgencyDto = z.object({
  commandBar: z.object({
    openMaintenance: z.number(),
    upcomingBookings: z.number(),
  }),
  domainBadges: z.object({
    maintenance: z.number(),
    bookings: z.number(),
    amenities: z.number(),
    'my-services': z.number(),
    events: z.number(),
  }),
});

export type UrgencyDto = z.infer<typeof urgencyDto>;
