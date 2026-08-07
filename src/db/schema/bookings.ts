import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { bookingStatusEnum } from './booking-status-enum';

export const bookings = pgTable('Booking', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  propertyId: text('propertyId'),
  userId: text('userId').notNull(),
  facility: text('facility').notNull(),
  date: timestamp('date', { mode: 'date', precision: 3 }).notNull(),
  startTime: text('startTime').notNull(),
  endTime: text('endTime').notNull(),
  purpose: text('purpose'),
  status: bookingStatusEnum('status').default('CONFIRMED').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
