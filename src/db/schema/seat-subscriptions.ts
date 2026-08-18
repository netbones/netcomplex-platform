import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { seatTypeEnum } from './seat-type-enum';
import { subscriptionStatusEnum } from './subscription-status-enum';

export const seatSubscriptions = pgTable('SeatSubscription', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  seatType: seatTypeEnum('seatType').notNull(),
  soloSeatId: text('soloSeatId'),
  premiumSeatId: text('premiumSeatId'),
  planId: text('planId').notNull(),
  status: subscriptionStatusEnum('status').default('PENDING').notNull(),
  isComplimentary: boolean('isComplimentary').default(false).notNull(),
  grantedByUserId: text('grantedByUserId'),
  startDate: timestamp('startDate', { mode: 'date', precision: 3 }),
  endDate: timestamp('endDate', { mode: 'date', precision: 3 }),
  nextBillingDate: timestamp('nextBillingDate', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
