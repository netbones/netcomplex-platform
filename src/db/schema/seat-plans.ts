import { pgTable, text, decimal, integer, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';
import { seatTypeEnum } from './seat-type-enum';
import { billingPlanIntervalEnum } from './billing-plan-interval-enum';

export const seatPlans = pgTable('SeatPlan', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId'),
  seatType: seatTypeEnum('seatType').notNull(),
  name: text('name').notNull(),
  price: decimal('price', { precision: 65, scale: 30 }).default('0').notNull(),
  multiplier: decimal('multiplier', { precision: 65, scale: 30 }).default('1').notNull(),
  currency: text('currency').default('ZAR').notNull(),
  interval: billingPlanIntervalEnum('interval').default('MONTHLY').notNull(),
  minimumHomes: integer('minimumHomes'),
  eligibilityRule: jsonb('eligibilityRule'),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
