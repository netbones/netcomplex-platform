import { relations } from 'drizzle-orm';
import { platformSuspensions } from './platform-suspensions';
import { tenants } from './tenants';
import { users } from './users';

export const platformSuspensionsRelations = relations(platformSuspensions, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'PlatformSuspensionToTenant', fields: [ platformSuspensions.tenantId ], references: [ tenants.id ] }), user: helpers.one(users, { relationName: 'PlatformSuspensionTouser', fields: [ platformSuspensions.userId ], references: [ users.id ] }) }));