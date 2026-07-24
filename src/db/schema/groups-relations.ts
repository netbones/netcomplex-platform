import { relations } from 'drizzle-orm';
import { groups } from './groups';
import { contents } from './contents';
import { users } from './users';
import { tenants } from './tenants';
import { groupMembers } from './group-members';
import { groupMembershipRequests } from './group-membership-requests';

export const groupsRelations = relations(groups, (helpers) => ({ Content: helpers.many(contents, { relationName: 'ContentToGroup' }), user: helpers.one(users, { relationName: 'GroupTouser', fields: [ groups.ownerId ], references: [ users.id ] }), Tenant: helpers.one(tenants, { relationName: 'GroupToTenant', fields: [ groups.tenantId ], references: [ tenants.id ] }), GroupMember: helpers.many(groupMembers, { relationName: 'GroupToGroupMember' }), GroupMembershipRequest: helpers.many(groupMembershipRequests, { relationName: 'GroupToGroupMembershipRequest' }) }));