import { pgTable, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { behaviorTypeEnum } from './behavior-type-enum';
import { behaviorCategoryEnum } from './behavior-category-enum';
import { behaviorRecordStatusEnum } from './behavior-record-status-enum';

export const communityMerits = pgTable('CommunityMerit', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  behaviorType: behaviorTypeEnum('behaviorType').notNull(),
  category: behaviorCategoryEnum('category').default('OTHER').notNull(),
  reason: text('reason').notNull(),
  description: text('description'),
  recognitionPoints: integer('recognitionPoints').default(0).notNull(),
  disciplinaryPoints: integer('disciplinaryPoints').default(0).notNull(),
  standingBefore: integer('standingBefore'),
  standingAfter: integer('standingAfter'),
  status: behaviorRecordStatusEnum('status').default('ACTIVE').notNull(),
  disputeReason: text('disputeReason'),
  disputedAt: timestamp('disputedAt', { mode: 'date', precision: 3 }),
  resolvedById: text('resolvedById'),
  resolvedAt: timestamp('resolvedAt', { mode: 'date', precision: 3 }),
  createdById: text('createdById').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  expiresAt: timestamp('expiresAt', { mode: 'date', precision: 3 }),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
  disputeHistory: jsonb('disputeHistory'),
});
