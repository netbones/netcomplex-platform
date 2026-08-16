import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { relationshipTypeEnum } from './relationship-type-enum';
import { joinRequestStatusEnum } from './join-request-status-enum';

export const propertyJoinRequests = pgTable('PropertyJoinRequest', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  propertyId: text('propertyId'),
  propertyNumberRaw: text('propertyNumberRaw').notNull(),
  relationshipType: relationshipTypeEnum('relationshipType').notNull(),
  requestedName: text('requestedName').notNull(),
  requestedSurname: text('requestedSurname'),
  requestedEmail: text('requestedEmail').notNull(),
  requestedPhone: text('requestedPhone'),
  rulesAcceptedAt: timestamp('rulesAcceptedAt', { mode: 'date', precision: 3 }),
  status: joinRequestStatusEnum('status').default('PENDING').notNull(),
  reviewedByUserId: text('reviewedByUserId'),
  reviewedAt: timestamp('reviewedAt', { mode: 'date', precision: 3 }),
  rejectionReason: text('rejectionReason'),
  resultingInvitationId: text('resultingInvitationId'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
