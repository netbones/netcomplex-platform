import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { priorityEnum } from './priority-enum';
import { requestStatusEnum } from './request-status-enum';

export const maintenanceRequests = pgTable('MaintenanceRequest', { id: text('id').primaryKey(), userId: text('userId').notNull(), category: text('category').notNull(), priority: priorityEnum('priority').notNull(), description: text('description').notNull(), status: requestStatusEnum('status').default('SUBMITTED').notNull(), images: text('images').array().notNull(), createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(), updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull() });