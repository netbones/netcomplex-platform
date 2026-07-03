import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { notifications } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullableDateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const notificationDto = createSelectSchema(notifications, {
  readAt: nullableDateSchema,
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

export type NotificationDto = z.infer<typeof notificationDto>;
export type NotificationDTO = NotificationDto;

export function toNotificationDTO(row: z.input<typeof notificationDto>): NotificationDto {
  return notificationDto.parse(row);
}

export function toNotificationDTOs(rows: z.input<typeof notificationDto>[]): NotificationDto[] {
  return rows.map(row => notificationDto.parse(row));
}
