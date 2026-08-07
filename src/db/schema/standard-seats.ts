import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { seatStatusEnum } from './seat-status-enum';

export const standardSeats = pgTable('StandardSeat', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  propertyId: text('propertyId').notNull(),
  isPrimaryOwner: boolean('isPrimaryOwner').default(true).notNull(),
  platformAddress: text('platformAddress').notNull(),
  organizationId: text('organizationId'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  archivedAt: timestamp('archivedAt', { mode: 'date', precision: 3 }),
  status: seatStatusEnum('status').default('ACTIVE').notNull(),
  addressId: text('addressId'),
});
