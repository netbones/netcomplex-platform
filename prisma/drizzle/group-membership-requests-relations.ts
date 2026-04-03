import { relations } from 'drizzle-orm';
import { groupMembershipRequests } from './group-membership-requests';
import { groups } from './groups';
import { users } from './users';

export const groupMembershipRequestsRelations = relations(groupMembershipRequests, helpers => ({
  Group: helpers.one(groups, {
    relationName: 'GroupToGroupMembershipRequest',
    fields: [groupMembershipRequests.groupId],
    references: [groups.id],
  }),
  user: helpers.one(users, {
    relationName: 'GroupMembershipRequestTouser',
    fields: [groupMembershipRequests.userId],
    references: [users.id],
  }),
}));
