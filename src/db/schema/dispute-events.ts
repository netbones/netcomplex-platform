import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { disputeEventTypeEnum } from './dispute-event-type-enum';
import { disputeStatusEnum } from './dispute-status-enum';

export const disputeEvents = pgTable('DisputeEvent', { id: text('id').primaryKey(), tenantId: text('tenantId').notNull(), disputeId: text('disputeId').notNull(), actorId: text('actorId'), eventType: disputeEventTypeEnum('eventType').notNull(), fromStatus: disputeStatusEnum('fromStatus'), toStatus: disputeStatusEnum('toStatus'), note: text('note'), metadata: jsonb('metadata'), createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull() });