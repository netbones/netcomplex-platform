import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { residencyTypeEnum } from './residency-type-enum';
import { roleEnum } from './role-enum';
import { invitationStatusEnum } from './invitation-status-enum';

export const invitations = pgTable('invitation', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  street: text('street'),
  unit: text('unit'),
  residencyType: residencyTypeEnum('residencyType').default('OWNER').notNull(),
  role: roleEnum('role').default('RESIDENT').notNull(),
  token: text('token').notNull(),
  status: invitationStatusEnum('status').default('PENDING').notNull(),
  expiresAt: timestamp('expiresAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  organizationId: text('organizationId').notNull(),
  inviterId: text('inviterId').notNull(),
});
