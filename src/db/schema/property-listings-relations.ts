import { relations } from 'drizzle-orm';
import { propertyListings } from './property-listings';
import { users } from './users';
import { properties } from './properties';
import { tenants } from './tenants';

export const propertyListingsRelations = relations(propertyListings, (helpers) => ({ user_propertyListing_assignedAgentIdTouser: helpers.one(users, { relationName: 'propertyListing_assignedAgentIdTouser', fields: [ propertyListings.assignedAgentId ], references: [ users.id ] }), user_propertyListing_ownerIdTouser: helpers.one(users, { relationName: 'propertyListing_ownerIdTouser', fields: [ propertyListings.ownerId ], references: [ users.id ] }), property: helpers.one(properties, { relationName: 'PropertyToPropertyListing', fields: [ propertyListings.propertyId ], references: [ properties.id ] }), Tenant: helpers.one(tenants, { relationName: 'PropertyListingToTenant', fields: [ propertyListings.tenantId ], references: [ tenants.id ] }) }));