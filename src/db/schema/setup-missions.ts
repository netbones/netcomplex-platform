import { pgTable, text, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const setupMissions = pgTable('SetupMission', {
  id: text('id').primaryKey(),
  tenantSetupId: text('tenantSetupId').notNull(),
  section: text('section').notNull(),
  missionKey: text('missionKey').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  isRequired: boolean('isRequired').default(false).notNull(),
  isCompleted: boolean('isCompleted').default(false).notNull(),
  completedAt: timestamp('completedAt', { mode: 'date', precision: 3 }),
  sortOrder: integer('sortOrder').default(0).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
