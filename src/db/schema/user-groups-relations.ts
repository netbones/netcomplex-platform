import { relations } from 'drizzle-orm';
import { userGroups } from './user-groups';
import { groups } from './groups';
import { users } from './users';

export const userGroupsRelations = relations(userGroups, helpers => ({
  Group: helpers.one(groups, {
    relationName: 'GroupToUserGroup',
    fields: [userGroups.groupId],
    references: [groups.id],
  }),
  user: helpers.one(users, {
    relationName: 'UserGroupTouser',
    fields: [userGroups.userId],
    references: [users.id],
  }),
}));
