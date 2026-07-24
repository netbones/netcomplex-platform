import { relations } from 'drizzle-orm';
import { communityMerits } from './community-merits';
import { tenants } from './tenants';
import { users } from './users';

export const communityMeritsRelations = relations(communityMerits, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'CommunityMeritToTenant', fields: [ communityMerits.tenantId ], references: [ tenants.id ] }), createdBy: helpers.one(users, { relationName: 'CommunityMeritCreatedBy', fields: [ communityMerits.createdById ], references: [ users.id ] }), resolvedBy: helpers.one(users, { relationName: 'CommunityMeritResolvedBy', fields: [ communityMerits.resolvedById ], references: [ users.id ] }), user: helpers.one(users, { relationName: 'CommunityMeritSubject', fields: [ communityMerits.userId ], references: [ users.id ] }) }));