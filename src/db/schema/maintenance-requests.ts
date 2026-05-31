import { pgTable, text, timestamp, decimal } from 'drizzle-orm/pg-core';
import { priorityEnum } from './priority-enum';
import { requestStatusEnum } from './request-status-enum';

export const maintenanceRequests = pgTable('MaintenanceRequest', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  propertyId: text('propertyId'),
  userId: text('userId').notNull(),
  category: text('category').notNull(),
  priority: priorityEnum('priority').notNull(),
  description: text('description').notNull(),
  status: requestStatusEnum('status').default('SUBMITTED').notNull(),
  images: text('images').array().notNull(),
  assignedTo: text('assignedTo'),
  vendor: text('vendor'),
  scheduledDate: timestamp('scheduledDate', { mode: 'date', precision: 3 }),
  estimatedCost: decimal('estimatedCost', { precision: 65, scale: 30 }),
  actualCost: decimal('actualCost', { precision: 65, scale: 30 }),
  resolution: text('resolution'),
  completedAt: timestamp('completedAt', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  ticketNumber: text('ticketNumber').notNull(),
  preferredDate: timestamp('preferredDate', { mode: 'date', precision: 3 }),
  preferredTime: text('preferredTime'),
  assignedTeamId: text('assignedTeamId'),
  assignedProviderId: text('assignedProviderId'),
});
