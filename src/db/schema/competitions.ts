import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { competitionStatusEnum } from './competition-status-enum';
import { competitionTypeEnum } from './competition-type-enum';

export const competitions = pgTable('Competition', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  rules: text('rules'),
  prizeInfo: text('prizeInfo'),
  startDate: timestamp('startDate', { mode: 'date', precision: 3 }).notNull(),
  endDate: timestamp('endDate', { mode: 'date', precision: 3 }).notNull(),
  status: competitionStatusEnum('status').default('DRAFT').notNull(),
  entryCount: integer('entryCount').default(0).notNull(),
  type: competitionTypeEnum('type').default('RAFFLE').notNull(),
  winnersCount: integer('winnersCount').default(1).notNull(),
  maxParticipants: integer('maxParticipants'),
  image: text('image'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
