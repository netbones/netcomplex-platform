import { relations } from 'drizzle-orm';
import { residentDelegations } from './resident-delegations';
import { properties } from './properties';
import { users } from './users';
import { profiles } from './profiles';

export const residentDelegationsRelations = relations(residentDelegations, (helpers) => ({ property: helpers.one(properties, { relationName: 'PropertyToResidentDelegation', fields: [ residentDelegations.propertyId ], references: [ properties.id ] }), owner: helpers.one(users, { relationName: 'ResidentDelegation_owner', fields: [ residentDelegations.ownerId ], references: [ users.id ] }), profile: helpers.one(profiles, { relationName: 'ProfileToResidentDelegation', fields: [ residentDelegations.profileId ], references: [ profiles.id ] }) }));