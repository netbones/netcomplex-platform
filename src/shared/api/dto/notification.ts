import type { InferSelectModel } from 'drizzle-orm';
import { notifications } from '@api/db';

// API-safe notification shape
export interface NotificationDTO {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

// Maps a Drizzle notification row to NotificationDTO
export function toNotificationDTO(
  notification: InferSelectModel<typeof notifications>
): NotificationDTO {
  return {
    id: notification.id,
    userId: notification.userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    link: notification.link || null,
    read: notification.read,
    createdAt: notification.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

// Maps an array of Drizzle notification rows to NotificationDTO[]
export function toNotificationDTOs(
  notificationRows: InferSelectModel<typeof notifications>[]
): NotificationDTO[] {
  return notificationRows.map(toNotificationDTO);
}
