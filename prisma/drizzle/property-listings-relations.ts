import { relations } from 'drizzle-orm';
import { propertyListings } from './property-listings';
import { users } from './users';
import { households } from './households';

export const propertyListingsRelations = relations(propertyListings, (helpers) => ({ user_propertyListing_assignedAgentIdTouser: helpers.one(users, { relationName: 'propertyListing_assignedAgentIdTouser', fields: [ propertyListings.assignedAgentId ], references: [ users.id ] }), household: helpers.one(households, { relationName: 'householdTopropertyListing', fields: [ propertyListings.householdId ], references: [ households.id ] }), user_propertyListing_ownerIdTouser: helpers.one(users, { relationName: 'propertyListing_ownerIdTouser', fields: [ propertyListings.ownerId ], references: [ users.id ] }) }));