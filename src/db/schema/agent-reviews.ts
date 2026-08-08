import { pgTable, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';

export const agentReviews = pgTable('AgentReview', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  agentProfileId: text('agentProfileId').notNull(),
  reviewerId: text('reviewerId').notNull(),
  rating: integer('rating').notNull(),
  title: text('title'),
  comment: text('comment'),
  serviceDate: timestamp('serviceDate', { mode: 'date', precision: 3 }),
  responseQuality: integer('responseQuality'),
  isPublished: boolean('isPublished').default(true).notNull(),
  moderatedBy: text('moderatedBy'),
  moderatedAt: timestamp('moderatedAt', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
