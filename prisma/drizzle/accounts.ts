import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { mode: 'date', precision: 3 }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { mode: 'date', precision: 3 }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
