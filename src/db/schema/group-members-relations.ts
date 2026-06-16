import { relations } from 'drizzle-orm';
import { groupMembers } from './group-members';
import { groups } from './groups';
import { users } from './users';

export const groupMembersRelations = relations(groupMembers, (helpers) => ({ Group: helpers.one(groups, { relationName: 'GroupToGroupMember', fields: [ groupMembers.groupId ], references: [ groups.id ] }), user: helpers.one(users, { relationName: 'GroupMemberTouser', fields: [ groupMembers.userId ], references: [ users.id ] }) }));