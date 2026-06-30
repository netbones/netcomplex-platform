import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { householdRoleEnum } from './household-role-enum';
import { profileStatusEnum } from './profile-status-enum';
import { residencyTypeEnum } from './residency-type-enum';

export const profiles = pgTable('Profile', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  householdId: text('householdId').notNull(),
  displayName: text('displayName').notNull(),
  profileAddress: text('profileAddress').notNull(),
  userId: text('userId'),
  avatar: text('avatar'),
  isPublic: boolean('isPublic').default(true).notNull(),
  showEmail: boolean('showEmail').default(true).notNull(),
  showPhone: boolean('showPhone').default(true).notNull(),
  occupantSince: timestamp('occupantSince', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  householdRole: householdRoleEnum('householdRole').default('OCCUPANT').notNull(),
  leaseStartDate: timestamp('leaseStartDate', { mode: 'date', precision: 3 }),
  leaseEndDate: timestamp('leaseEndDate', { mode: 'date', precision: 3 }),
  status: profileStatusEnum('status').default('ACTIVE').notNull(),
  organizationId: text('organizationId'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
  aliasAddressId: text('aliasAddressId'),
  occupantImage: text('occupantImage'),
  rentalImage: text('rentalImage'),
  landlordId: text('landlordId'),
  residencyType: residencyTypeEnum('residencyType').default('FAMILY').notNull(),
});
