import { pgTable, text, boolean, integer } from 'drizzle-orm/pg-core';

export const tenantAchievements = pgTable('TenantAchievement', { id: text('id').primaryKey(), tenantId: text('tenantId').notNull(), definitionId: text('definitionId').notNull(), enabled: boolean('enabled').default(true).notNull(), customThreshold: integer('customThreshold'), icon: text('icon') });