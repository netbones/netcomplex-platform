import { pgTable, text, timestamp, decimal } from 'drizzle-orm/pg-core';
import { agentAccessLevelEnum } from './agent-access-level-enum';
import { delegationStatusEnum } from './delegation-status-enum';

export const agentAccesses = pgTable('AgentAccess', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  agentId: text('agentId').notNull(),
  propertyId: text('propertyId').notNull(),
  grantedById: text('grantedById').notNull(),
  accessLevel: agentAccessLevelEnum('accessLevel').default('MANAGEMENT').notNull(),
  permissions: text('permissions').array().notNull(),
  originalPermissions: text('originalPermissions').array().notNull(),
  startedAt: timestamp('startedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  expiresAt: timestamp('expiresAt', { mode: 'date', precision: 3 }).notNull(),
  status: delegationStatusEnum('status').default('PENDING').notNull(),
  acceptedAt: timestamp('acceptedAt', { mode: 'date', precision: 3 }),
  rejectedAt: timestamp('rejectedAt', { mode: 'date', precision: 3 }),
  revokedAt: timestamp('revokedAt', { mode: 'date', precision: 3 }),
  commissionRate: decimal('commissionRate', { precision: 65, scale: 30 }),
  contractTerms: text('contractTerms'),
  organizationId: text('organizationId'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
