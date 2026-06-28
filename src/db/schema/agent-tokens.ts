import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const agentTokens = pgTable('AgentToken', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  agentId: text('agentId').notNull(),
  issuedById: text('issuedById').notNull(),
  accessId: text('accessId'),
  name: text('name').notNull(),
  tokenHash: text('tokenHash').notNull(),
  scope: jsonb('scope').notNull(),
  credentialType: text('credentialType').default('jwt_es256').notNull(),
  credentialMeta: jsonb('credentialMeta'),
  expiresAt: timestamp('expiresAt', { mode: 'date', precision: 3 }).notNull(),
  lastUsedAt: timestamp('lastUsedAt', { mode: 'date', precision: 3 }),
  revokedAt: timestamp('revokedAt', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
