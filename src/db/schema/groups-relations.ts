import { relations } from 'drizzle-orm';
import { groups } from './groups';
import { contents } from './contents';
import { users } from './users';
import { groupMembershipRequests } from './group-membership-requests';
import { groupMembers } from './group-members';

export const groupsRelations = relations(groups, (helpers) => ({ Content: helpers.many(contents, { relationName: 'ContentToGroup' }), user: helpers.one(users, { relationName: 'GroupTouser', fields: [ groups.ownerId ], references: [ users.id ] }), GroupMembershipRequest: helpers.many(groupMembershipRequests, { relationName: 'GroupToGroupMembershipRequest' }), GroupMember: helpers.many(groupMembers, { relationName: 'GroupToGroupMember' }) }));