import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { agentProfiles } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullDate = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const agentProfileDto = createSelectSchema(agentProfiles, {
  rating: z.number(),
  reviewCount: z.number(),
  verificationDate: nullDate,
  createdAt: dateSch,
  updatedAt: dateSch,
})
  .pick({
    id: true,
    agencyName: true,
    licenseNumber: true,
    experienceYears: true,
    specializations: true,
    serviceAreas: true,
    totalListings: true,
    activeListings: true,
    salesCompleted: true,
    rating: true,
    reviewCount: true,
    isVerified: true,
    verificationDate: true,
  })
  .extend({
    agent: z.object({ id: z.string(), name: z.string() }).optional(),
  });

export type AgentProfileDto = z.infer<typeof agentProfileDto>;
