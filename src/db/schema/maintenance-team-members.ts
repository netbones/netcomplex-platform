import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const maintenanceTeamMembers = pgTable('MaintenanceTeamMember', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  teamId: text('teamId').notNull(),
  userId: text('userId').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
