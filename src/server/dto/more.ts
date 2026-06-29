import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { achievementDefinitions } from '@/db/schema/achievement-definitions';
import { invitations } from '@/db/schema/invitations';
import { settings } from '@/db/schema/settings';
import { agentProfiles } from '@/db/schema/agent-profiles';

const dateSchema = z.date().transform(d => d.toISOString());

export const achievementDto = createSelectSchema(achievementDefinitions, {
  createdAt: dateSchema,
}).pick({
  id: true,
  key: true,
  label: true,
  description: true,
  icon: true,
  category: true,
  threshold: true,
  eventType: true,
  createdAt: true,
});

export const achievementProgressDto = z.object({
  definitionKey: z.string(),
  definitionId: z.string(),
  label: z.string(),
  count: z.number(),
  threshold: z.number(),
  percentage: z.number(),
  updatedAt: dateSchema.nullable(),
});

export const invitationDto = createSelectSchema(invitations, {
  expiresAt: dateSchema.nullable(),
  createdAt: dateSchema,
}).pick({
  id: true,
  email: true,
  name: true,
  street: true,
  unit: true,
  residencyType: true,
  role: true,
  status: true,
  expiresAt: true,
  createdAt: true,
});

export const settingDto = createSelectSchema(settings, {
  updatedAt: dateSchema.optional(),
}).pick({ key: true, value: true });

export const agentProfileDto = createSelectSchema(agentProfiles, {
  rating: z.number(),
  reviewCount: z.number(),
  verificationDate: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
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

export type AchievementDto = z.infer<typeof achievementDto>;
export type AchievementProgressDto = z.infer<typeof achievementProgressDto>;
export type InvitationDto = z.infer<typeof invitationDto>;
export type SettingDto = z.infer<typeof settingDto>;
export type AgentProfileDto = z.infer<typeof agentProfileDto>;
