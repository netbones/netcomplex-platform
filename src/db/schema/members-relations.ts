import { relations } from 'drizzle-orm';
import { members } from './members';
import { organizations } from './organizations';
import { tenants } from './tenants';
import { users } from './users';

export const membersRelations = relations(members, (helpers) => ({ organization: helpers.one(organizations, { relationName: 'MemberToOrganization', fields: [ members.organizationId ], references: [ organizations.id ] }), Tenant: helpers.one(tenants, { relationName: 'MemberToTenant', fields: [ members.tenantId ], references: [ tenants.id ] }), user: helpers.one(users, { relationName: 'MemberTouser', fields: [ members.userId ], references: [ users.id ] }) }));