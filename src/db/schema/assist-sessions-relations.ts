import { relations } from 'drizzle-orm';
import { assistSessions } from './assist-sessions';
import { tenants } from './tenants';
import { users } from './users';

export const assistSessionsRelations = relations(assistSessions, helpers => ({
  tenant: helpers.one(tenants, {
    relationName: 'AssistSessionToTenant',
    fields: [assistSessions.tenantId],
    references: [tenants.id],
  }),
  staff: helpers.one(users, {
    relationName: 'AssistSessionTouser',
    fields: [assistSessions.staffId],
    references: [users.id],
  }),
}));
