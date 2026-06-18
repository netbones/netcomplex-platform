import { relations } from 'drizzle-orm';
import { members } from './members';
import { organizations } from './organizations';
import { users } from './users';

export const membersRelations = relations(members, helpers => ({
  organization: helpers.one(organizations, {
    relationName: 'MemberToOrganization',
    fields: [members.organizationId],
    references: [organizations.id],
  }),
  user: helpers.one(users, {
    relationName: 'MemberTouser',
    fields: [members.userId],
    references: [users.id],
  }),
}));
