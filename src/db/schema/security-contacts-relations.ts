import { relations } from 'drizzle-orm';
import { securityContacts } from './security-contacts';
import { tenants } from './tenants';
import { users } from './users';

export const securityContactsRelations = relations(securityContacts, helpers => ({
  tenant: helpers.one(tenants, {
    relationName: 'SecurityContactToTenant',
    fields: [securityContacts.tenantId],
    references: [tenants.id],
  }),
  createdByUser: helpers.one(users, {
    relationName: 'SecurityContactCreatedBy',
    fields: [securityContacts.createdByUserId],
    references: [users.id],
  }),
}));
