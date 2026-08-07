import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { invitations } from './invitations';
import { members } from './members';
import { tenants } from './tenants';

export const organizationsRelations = relations(organizations, helpers => ({
  invitation: helpers.many(invitations, { relationName: 'InvitationToOrganization' }),
  member: helpers.many(members, { relationName: 'MemberToOrganization' }),
  Tenant: helpers.one(tenants, {
    relationName: 'OrganizationToTenant',
    fields: [organizations.tenantId],
    references: [tenants.id],
  }),
}));
