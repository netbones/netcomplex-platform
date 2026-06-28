import { z } from 'zod';

const dateSchema = z.date().transform(d => d.toISOString());

export const eventDto = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  date: dateSchema,
  location: z.string(),
  organizer: z.string(),
  image: z.string().nullable(),
  isPublic: z.boolean(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export const bookingDto = z.object({
  id: z.string(),
  propertyId: z.string().nullable(),
  userId: z.string(),
  facility: z.string(),
  date: dateSchema,
  startTime: z.string(),
  endTime: z.string(),
  purpose: z.string().nullable(),
  status: z.string(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export const groupDto = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  image: z.string().nullable(),
  color: z.string(),
  isPublic: z.boolean(),
  accessType: z.string(),
  residentFilter: z.string(),
  isActive: z.boolean(),
  ownerId: z.string(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export const groupDetailDto = groupDto.extend({
  owner: z
    .object({
      id: z.string(),
      name: z.string(),
      image: z.string().nullable(),
    })
    .nullable(),
  members: z
    .array(
      z.object({
        id: z.string(),
        userId: z.string(),
        groupId: z.string(),
        role: z.string(),
        joinedAt: dateSchema,
        user: z
          .object({
            id: z.string(),
            name: z.string(),
            image: z.string().nullable(),
          })
          .nullable(),
      })
    )
    .optional(),
  contents: z.array(z.unknown()).optional(),
});

export const meritDto = z.object({
  id: z.string(),
  userId: z.string(),
  behaviorType: z.string(),
  category: z.string(),
  reason: z.string(),
  description: z.string().nullable(),
  recognitionPoints: z.number(),
  disciplinaryPoints: z.number(),
  standingBefore: z.number().nullable(),
  standingAfter: z.number().nullable(),
  status: z.string(),
  createdById: z.string(),
  createdAt: dateSchema,
  expiresAt: dateSchema.nullable(),
});

export const notificationDto = z.object({
  id: z.string(),
  userId: z.string(),
  senderId: z.string().nullable(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  link: z.string().nullable(),
  read: z.boolean(),
  readAt: dateSchema.nullable(),
  createdAt: dateSchema,
});

export type EventDto = z.infer<typeof eventDto>;
export type BookingDto = z.infer<typeof bookingDto>;
export type GroupDto = z.infer<typeof groupDto>;
export type GroupDetailDto = z.infer<typeof groupDetailDto>;
export type MeritDto = z.infer<typeof meritDto>;
export type NotificationDto = z.infer<typeof notificationDto>;
