import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { events } from '@/db/schema/events';
import { bookings } from '@/db/schema/bookings';
import { groups } from '@/db/schema/groups';
import { communityMerits } from '@/db/schema/community-merits';
import { notifications } from '@/db/schema/notifications';

const dateSchema = z.date().transform(d => d.toISOString());

export const eventDto = createSelectSchema(events, {
  date: dateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  title: true,
  description: true,
  date: true,
  location: true,
  organizer: true,
  image: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
});

export const bookingDto = createSelectSchema(bookings, {
  date: dateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  propertyId: true,
  userId: true,
  facility: true,
  date: true,
  startTime: true,
  endTime: true,
  purpose: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const groupDto = createSelectSchema(groups, {
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  name: true,
  description: true,
  category: true,
  image: true,
  color: true,
  isPublic: true,
  accessType: true,
  residentFilter: true,
  isActive: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
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

export const meritDto = createSelectSchema(communityMerits, {
  recognitionPoints: z.number(),
  disciplinaryPoints: z.number(),
  standingBefore: z.number().nullable(),
  standingAfter: z.number().nullable(),
  createdAt: dateSchema,
  expiresAt: dateSchema.nullable(),
}).pick({
  id: true,
  userId: true,
  behaviorType: true,
  category: true,
  reason: true,
  description: true,
  recognitionPoints: true,
  disciplinaryPoints: true,
  standingBefore: true,
  standingAfter: true,
  status: true,
  createdById: true,
  createdAt: true,
  expiresAt: true,
});

export const notificationDto = createSelectSchema(notifications, {
  readAt: dateSchema.nullable(),
  createdAt: dateSchema,
}).pick({
  id: true,
  userId: true,
  senderId: true,
  title: true,
  message: true,
  type: true,
  link: true,
  read: true,
  readAt: true,
  createdAt: true,
});

export type EventDto = z.infer<typeof eventDto>;
export type BookingDto = z.infer<typeof bookingDto>;
export type GroupDto = z.infer<typeof groupDto>;
export type GroupDetailDto = z.infer<typeof groupDetailDto>;
export type MeritDto = z.infer<typeof meritDto>;
export type NotificationDto = z.infer<typeof notificationDto>;
