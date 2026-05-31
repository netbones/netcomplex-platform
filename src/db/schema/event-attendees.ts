import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const eventAttendees = pgTable('EventAttendee', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  eventId: text('eventId').notNull(),
  userId: text('userId').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
