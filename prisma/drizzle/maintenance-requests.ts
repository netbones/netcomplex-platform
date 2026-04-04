import { pgTable, text, timestamp, decimal } from 'drizzle-orm/pg-core';
import { priorityEnum } from './priority-enum';
import { requestStatusEnum } from './request-status-enum';

export const maintenanceRequests = pgTable('MaintenanceRequest', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  category: text('category').notNull(),
  priority: priorityEnum('priority').notNull(),
  description: text('description').notNull(),
  status: requestStatusEnum('status').default('SUBMITTED').notNull(),
  images: text('images').array().notNull(),

  // Assignment & Scheduling
  assignedTo: text('assignedTo'),
  vendor: text('vendor'),
  scheduledDate: timestamp('scheduledDate', { mode: 'date', precision: 3 }),

  // Cost tracking
  estimatedCost: decimal('estimatedCost', { precision: 10, scale: 2 }),
  actualCost: decimal('actualCost', { precision: 10, scale: 2 }),

  // Resolution
  resolution: text('resolution'),
  completedAt: timestamp('completedAt', { mode: 'date', precision: 3 }),

  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
