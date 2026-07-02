import { relations } from 'drizzle-orm';
import { residentDelegations } from './resident-delegations';
import { users } from './users';
import { profiles } from './profiles';
import { properties } from './properties';

export const residentDelegationsRelations = relations(residentDelegations, helpers => ({
  owner: helpers.one(users, {
    relationName: 'ResidentDelegation_owner',
    fields: [residentDelegations.ownerId],
    references: [users.id],
  }),
  profile: helpers.one(profiles, {
    relationName: 'ProfileToResidentDelegation',
    fields: [residentDelegations.profileId],
    references: [profiles.id],
  }),
  property: helpers.one(properties, {
    relationName: 'PropertyToResidentDelegation',
    fields: [residentDelegations.propertyId],
    references: [properties.id],
  }),
}));
