import { relations } from 'drizzle-orm';
import { invitations } from './invitations';
import { users } from './users';
import { organizations } from './organizations';

export const invitationsRelations = relations(invitations, (helpers) => ({ user: helpers.one(users, { relationName: 'invitationTouser', fields: [ invitations.inviterId ], references: [ users.id ] }), organization: helpers.one(organizations, { relationName: 'invitationToorganization', fields: [ invitations.organizationId ], references: [ organizations.id ] }) }));