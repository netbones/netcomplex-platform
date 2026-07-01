import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { handleStatusEnum } from './handle-status-enum';

export const handles = pgTable('Handle', { id: text('id').primaryKey(), tenantId: text('tenantId').notNull(), handle: text('handle').notNull(), addressId: text('addressId').notNull(), status: handleStatusEnum('status').default('ACTIVE').notNull(), createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull() });