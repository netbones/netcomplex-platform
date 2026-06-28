import { z } from 'zod';

const dateSchema = z.date().transform(d => d.toISOString());

export const achievementDto = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  category: z.string(),
  threshold: z.number(),
  eventType: z.string(),
  createdAt: dateSchema,
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

export const invitationDto = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  street: z.string().nullable(),
  unit: z.string().nullable(),
  residencyType: z.string(),
  role: z.string(),
  status: z.string(),
  expiresAt: dateSchema.nullable(),
  createdAt: dateSchema,
});

export const settingDto = z.object({
  key: z.string(),
  value: z.string(),
});

export const agentProfileDto = z.object({
  id: z.string(),
  agencyName: z.string().nullable(),
  licenseNumber: z.string().nullable(),
  experienceYears: z.number(),
  specializations: z.array(z.string()),
  serviceAreas: z.array(z.string()),
  totalListings: z.number(),
  activeListings: z.number(),
  salesCompleted: z.number(),
  rating: z.number(),
  reviewCount: z.number(),
  isVerified: z.boolean(),
  verificationDate: dateSchema.nullable(),
  agent: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),
});

export type AchievementDto = z.infer<typeof achievementDto>;
export type AchievementProgressDto = z.infer<typeof achievementProgressDto>;
export type InvitationDto = z.infer<typeof invitationDto>;
export type SettingDto = z.infer<typeof settingDto>;
export type AgentProfileDto = z.infer<typeof agentProfileDto>;
