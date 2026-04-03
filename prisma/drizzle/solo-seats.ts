import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { soloSeatTypeEnum } from './solo-seat-type-enum';

export const soloSeats = pgTable('soloSeat', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  platformAddress: text('platformAddress').notNull(),
  householdId: text('householdId'),
  seatType: soloSeatTypeEnum('seatType').notNull(),
  isComplimentary: boolean('isComplimentary').default(false).notNull(),
  linkedFromProfileId: text('linkedFromProfileId'),
  organizationId: text('organizationId'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
