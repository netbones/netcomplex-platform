import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { disputeRespondentEnum } from './dispute-respondent-enum';
import { disputeCategoryEnum } from './dispute-category-enum';
import { disputeSeverityEnum } from './dispute-severity-enum';
import { disputeStatusEnum } from './dispute-status-enum';

export const disputeCases = pgTable('DisputeCase', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  referenceNumber: text('referenceNumber').notNull(),
  complainantId: text('complainantId').notNull(),
  respondentId: text('respondentId'),
  respondentType: disputeRespondentEnum('respondentType').default('RESIDENT').notNull(),
  category: disputeCategoryEnum('category').notNull(),
  subcategory: text('subcategory'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  desiredOutcome: text('desiredOutcome'),
  severity: disputeSeverityEnum('severity').default('MODERATE').notNull(),
  status: disputeStatusEnum('status').default('DRAFT').notNull(),
  intakeCompletedAt: timestamp('intakeCompletedAt', { mode: 'date', precision: 3 }),
  coolingOffEndsAt: timestamp('coolingOffEndsAt', { mode: 'date', precision: 3 }),
  submittedAt: timestamp('submittedAt', { mode: 'date', precision: 3 }),
  assignedModeratorId: text('assignedModeratorId'),
  mediationOfferedAt: timestamp('mediationOfferedAt', { mode: 'date', precision: 3 }),
  mediationAcceptedAt: timestamp('mediationAcceptedAt', { mode: 'date', precision: 3 }),
  rulingIssuedAt: timestamp('rulingIssuedAt', { mode: 'date', precision: 3 }),
  rulingDescription: text('rulingDescription'),
  csosReferenceNumber: text('csosReferenceNumber'),
  csosEscalatedAt: timestamp('csosEscalatedAt', { mode: 'date', precision: 3 }),
  csosClosedAt: timestamp('csosClosedAt', { mode: 'date', precision: 3 }),
  resolvedAt: timestamp('resolvedAt', { mode: 'date', precision: 3 }),
  closedById: text('closedById'),
  closedReason: text('closedReason'),
  isConfidential: boolean('isConfidential').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
