import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { accessRequestStatusEnum } from './access-request-status-enum';

export const accessRequests = pgTable('AccessRequest', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  propertyId: text('propertyId').notNull(),
  gateId: text('gateId').notNull(),
  visitorName: text('visitorName').notNull(),
  visitorPhotoUrl: text('visitorPhotoUrl'),
  roleLabel: text('roleLabel'),
  vehicleReg: text('vehicleReg'),
  status: accessRequestStatusEnum('status').default('PENDING').notNull(),
  requestedAt: timestamp('requestedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  respondedAt: timestamp('respondedAt', { mode: 'date', precision: 3 }),
  respondedByUserId: text('respondedByUserId'),
  expiresAt: timestamp('expiresAt', { mode: 'date', precision: 3 }).notNull(),
});
