import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const propertyPremiumSeats = pgTable('PropertyPremiumSeat', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  propertyId: text('propertyId').notNull(),
  premiumSeatId: text('premiumSeatId').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
