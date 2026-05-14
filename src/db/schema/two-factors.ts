import { pgTable, text } from 'drizzle-orm/pg-core';

export const twoFactors = pgTable('twoFactor', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  secret: text('secret').notNull(),
  backupCodes: text('backupCodes').notNull(),
  userId: text('userId').notNull(),
});
