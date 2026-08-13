import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { bookingStatusEnum } from './booking-status-enum';

export const bookings = pgTable('Booking', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  amenityId: text('amenityId'),
  propertyId: text('propertyId'),
  userId: text('userId').notNull(),
  facility: text('facility'),
  date: timestamp('date', { mode: 'date', precision: 3 }).notNull(),
  startTime: text('startTime').notNull(),
  endTime: text('endTime').notNull(),
  startAt: timestamp('startAt', { mode: 'date', precision: 3 }),
  endAt: timestamp('endAt', { mode: 'date', precision: 3 }),
  status: bookingStatusEnum('status').default('CONFIRMED').notNull(),
  cancelledAt: timestamp('cancelledAt', { mode: 'date', precision: 3 }),
  purpose: text('purpose'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
