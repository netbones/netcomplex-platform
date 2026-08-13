import { pgTable, text, decimal, boolean, timestamp } from 'drizzle-orm/pg-core';
import { securityAlertTypeEnum } from './security-alert-type-enum';
import { securityAlertStatusEnum } from './security-alert-status-enum';

export const securityAlerts = pgTable('SecurityAlert', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  propertyId: text('propertyId'),
  triggeredByUserId: text('triggeredByUserId'),
  alertType: securityAlertTypeEnum('alertType').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  locationAccuracyM: decimal('locationAccuracyM', { precision: 8, scale: 2 }),
  withinBoundary: boolean('withinBoundary'),
  message: text('message'),
  status: securityAlertStatusEnum('status').default('SENT').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  acknowledgedAt: timestamp('acknowledgedAt', { mode: 'date', precision: 3 }),
  acknowledgedByUserId: text('acknowledgedByUserId'),
  resolvedAt: timestamp('resolvedAt', { mode: 'date', precision: 3 }),
  resolvedByUserId: text('resolvedByUserId'),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
