import { relations } from 'drizzle-orm';
import { groupMembershipRequests } from './group-membership-requests';
import { groups } from './groups';
import { tenants } from './tenants';
import { users } from './users';

export const groupMembershipRequestsRelations = relations(groupMembershipRequests, (helpers) => ({ Group: helpers.one(groups, { relationName: 'GroupToGroupMembershipRequest', fields: [ groupMembershipRequests.groupId ], references: [ groups.id ] }), Tenant: helpers.one(tenants, { relationName: 'GroupMembershipRequestToTenant', fields: [ groupMembershipRequests.tenantId ], references: [ tenants.id ] }), user: helpers.one(users, { relationName: 'GroupMembershipRequestTouser', fields: [ groupMembershipRequests.userId ], references: [ users.id ] }) }));