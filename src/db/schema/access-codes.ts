import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const accessCodes = pgTable('AccessCode', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  visitorId: text('visitorId').notNull(),
  code: text('code').notNull(),
  qrPayload: text('qrPayload').notNull(),
  shareUrl: text('shareUrl').notNull(),
  usedAt: timestamp('usedAt', { mode: 'date', precision: 3 }),
  revokedAt: timestamp('revokedAt', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
