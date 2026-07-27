import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { credentialTypeEnum } from './credential-type-enum';

export const credentials = pgTable('credentials', {
  id: text('id').primaryKey(),
  identityId: text('identityId').notNull(),
  type: credentialTypeEnum('type').notNull(),
  email: text('email'),
  publicKey: text('publicKey'),
  fingerprint: text('fingerprint'),
  metadata: jsonb('metadata'),
  revokedAt: timestamp('revokedAt', { mode: 'date', precision: 3 }),
  lastUsedAt: timestamp('lastUsedAt', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
