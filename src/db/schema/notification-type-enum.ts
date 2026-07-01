import { pgEnum } from 'drizzle-orm/pg-core';

export const notificationTypeEnum = pgEnum('NotificationType', ['info', 'warning', 'success', 'error']);