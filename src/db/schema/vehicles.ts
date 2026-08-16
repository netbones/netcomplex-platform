import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const vehicles = pgTable('Vehicle', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  joinRequestId: text('joinRequestId'),
  profileId: text('profileId'),
  standardSeatId: text('standardSeatId'),
  make: text('make'),
  model: text('model'),
  color: text('color'),
  registration: text('registration').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
