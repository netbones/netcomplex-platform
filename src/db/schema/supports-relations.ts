import { relations } from 'drizzle-orm';
import { supports } from './supports';
import { tenants } from './tenants';
import { users } from './users';

export const supportsRelations = relations(supports, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'SupportToTenant',
    fields: [supports.tenantId],
    references: [tenants.id],
  }),
  recipient: helpers.one(users, {
    relationName: 'ReceivedSupports',
    fields: [supports.recipientUserId],
    references: [users.id],
  }),
  sender: helpers.one(users, {
    relationName: 'SentSupports',
    fields: [supports.senderUserId],
    references: [users.id],
  }),
}));
