import { relations } from 'drizzle-orm';
import { members } from './members';
import { organizations } from './organizations';
import { users } from './users';

export const membersRelations = relations(members, (helpers) => ({ organization: helpers.one(organizations, { relationName: 'memberToorganization', fields: [ members.organizationId ], references: [ organizations.id ] }), user: helpers.one(users, { relationName: 'memberTouser', fields: [ members.userId ], references: [ users.id ] }) }));