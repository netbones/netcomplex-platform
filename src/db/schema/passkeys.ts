import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const passkeys = pgTable('passkey', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  name: text('name'),
  publicKey: text('publicKey').notNull(),
  userId: text('userId').notNull(),
  credentialID: text('credentialID').notNull(),
  counter: integer('counter').notNull(),
  deviceType: text('deviceType').notNull(),
  backedUp: boolean('backedUp').notNull(),
  transports: text('transports'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }),
  aaguid: text('aaguid'),
});
