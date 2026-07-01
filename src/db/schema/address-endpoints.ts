import { pgTable, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { endpointTypeEnum } from './endpoint-type-enum';

export const addressEndpoints = pgTable('AddressEndpoint', { id: text('id').primaryKey(), addressId: text('addressId').notNull(), type: endpointTypeEnum('type').notNull(), enabled: boolean('enabled').default(true).notNull(), config: jsonb('config'), createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull() });