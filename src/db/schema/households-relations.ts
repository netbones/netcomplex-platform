import { relations } from 'drizzle-orm';
import { households } from './households';
import { properties } from './properties';
import { tenants } from './tenants';
import { profiles } from './profiles';

export const householdsRelations = relations(households, (helpers) => ({ property: helpers.one(properties, { relationName: 'HouseholdToProperty', fields: [ households.propertyId ], references: [ properties.id ] }), Tenant: helpers.one(tenants, { relationName: 'HouseholdToTenant', fields: [ households.tenantId ], references: [ tenants.id ] }), profiles: helpers.many(profiles, { relationName: 'HouseholdToProfile' }) }));