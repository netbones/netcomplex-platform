import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { soloSeatTypeEnum } from './solo-seat-type-enum';
import { seatStatusEnum } from './seat-status-enum';

export const soloSeats = pgTable('SoloSeat', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  platformAddress: text('platformAddress').notNull(),
  propertyId: text('propertyId'),
  seatType: soloSeatTypeEnum('seatType').notNull(),
  isComplimentary: boolean('isComplimentary').default(false).notNull(),
  linkedFromProfileId: text('linkedFromProfileId'),
  organizationId: text('organizationId'),
  status: seatStatusEnum('status').default('ACTIVE').notNull(),
  archivedAt: timestamp('archivedAt', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
