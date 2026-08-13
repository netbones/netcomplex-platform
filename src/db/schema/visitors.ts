import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { visitorTypeEnum } from './visitor-type-enum';
import { visitTypeEnum } from './visit-type-enum';
import { visitorStatusEnum } from './visitor-status-enum';

export const visitors = pgTable('Visitor', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  propertyId: text('propertyId').notNull(),
  requestedByUserId: text('requestedByUserId').notNull(),
  fullName: text('fullName').notNull(),
  phone: text('phone'),
  photoUrl: text('photoUrl'),
  visitorType: visitorTypeEnum('visitorType').notNull(),
  vehicleReg: text('vehicleReg'),
  roleLabel: text('roleLabel'),
  visitType: visitTypeEnum('visitType').default('SINGLE').notNull(),
  validFrom: timestamp('validFrom', { mode: 'date', precision: 3 }).notNull(),
  validUntil: timestamp('validUntil', { mode: 'date', precision: 3 }),
  recurrenceRule: text('recurrenceRule'),
  status: visitorStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
