import { relations } from 'drizzle-orm';
import { assistSessions } from './assist-sessions';
import { users } from './users';
import { tenants } from './tenants';

export const assistSessionsRelations = relations(assistSessions, (helpers) => ({ staff: helpers.one(users, { relationName: 'AssistSessionTouser', fields: [ assistSessions.staffId ], references: [ users.id ] }), tenant: helpers.one(tenants, { relationName: 'AssistSessionToTenant', fields: [ assistSessions.tenantId ], references: [ tenants.id ] }) }));