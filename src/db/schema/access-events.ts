import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { accessEventStateEnum } from './access-event-state-enum';
import { accessEventMethodEnum } from './access-event-method-enum';
import { accessEventActorTypeEnum } from './access-event-actor-type-enum';

export const accessEvents = pgTable('AccessEvent', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  gateId: text('gateId').notNull(),
  propertyId: text('propertyId'),
  visitorId: text('visitorId'),
  accessRequestId: text('accessRequestId'),
  visitorLabel: text('visitorLabel').notNull(),
  vehicleReg: text('vehicleReg'),
  state: accessEventStateEnum('state').notNull(),
  method: accessEventMethodEnum('method').notNull(),
  actorType: accessEventActorTypeEnum('actorType').notNull(),
  actorUserId: text('actorUserId'),
  occurredAt: timestamp('occurredAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
