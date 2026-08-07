import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const outboxDeadLetters = pgTable('OutboxDeadLetter', {
  id: text('id').primaryKey(),
  outboxId: text('outboxId'),
  type: text('type').notNull(),
  version: integer('version').notNull(),
  tenantId: text('tenantId').notNull(),
  correlationId: text('correlationId'),
  payload: jsonb('payload').notNull(),
  error: text('error'),
  handler: text('handler'),
  attempts: integer('attempts'),
  deadLetteredAt: timestamp('deadLetteredAt', { mode: 'date', precision: 3 })
    .defaultNow()
    .notNull(),
});
