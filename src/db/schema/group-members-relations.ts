import { relations } from 'drizzle-orm';
import { groupMembers } from './group-members';
import { groups } from './groups';
import { tenants } from './tenants';
import { users } from './users';

export const groupMembersRelations = relations(groupMembers, helpers => ({
  Group: helpers.one(groups, {
    relationName: 'GroupToGroupMember',
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  Tenant: helpers.one(tenants, {
    relationName: 'GroupMemberToTenant',
    fields: [groupMembers.tenantId],
    references: [tenants.id],
  }),
  user: helpers.one(users, {
    relationName: 'GroupMemberTouser',
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));
