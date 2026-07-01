import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const userAchievements = pgTable('UserAchievement', { id: text('id').primaryKey(), tenantId: text('tenantId').notNull(), userId: text('userId').notNull(), definitionId: text('definitionId').notNull(), unlockedAt: timestamp('unlockedAt', { mode: 'date', precision: 3 }).defaultNow().notNull() });