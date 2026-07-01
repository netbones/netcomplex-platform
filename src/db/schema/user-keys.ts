import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const userKeys = pgTable('UserKey', { id: text('id').primaryKey(), userId: text('userId').notNull(), publicKey: text('publicKey').notNull(), createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(), revokedAt: timestamp('revokedAt', { mode: 'date', precision: 3 }) });