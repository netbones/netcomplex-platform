import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { invitations } from './invitations';
import { members } from './members';

export const organizationsRelations = relations(organizations, (helpers) => ({ invitation: helpers.many(invitations, { relationName: 'InvitationToOrganization' }), member: helpers.many(members, { relationName: 'MemberToOrganization' }) }));