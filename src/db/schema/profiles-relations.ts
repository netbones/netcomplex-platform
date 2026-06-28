import { relations } from 'drizzle-orm';
import { profiles } from './profiles';
import { households } from './households';
import { users } from './users';
import { residentDelegations } from './resident-delegations';

export const profilesRelations = relations(profiles, helpers => ({
  household: helpers.one(households, {
    relationName: 'HouseholdToProfile',
    fields: [profiles.householdId],
    references: [households.id],
  }),
  user_profile_landlordIdTouser: helpers.one(users, {
    relationName: 'profile_landlordIdTouser',
    fields: [profiles.landlordId],
    references: [users.id],
  }),
  user_profile_userIdTouser: helpers.one(users, {
    relationName: 'profile_userIdTouser',
    fields: [profiles.userId],
    references: [users.id],
  }),
  residentDelegations: helpers.many(residentDelegations, {
    relationName: 'ProfileToResidentDelegation',
  }),
}));
