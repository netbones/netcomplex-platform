import { relations } from 'drizzle-orm';
import { households } from './households';
import { properties } from './properties';
import { profiles } from './profiles';

export const householdsRelations = relations(households, (helpers) => ({ property: helpers.one(properties, { relationName: 'HouseholdToProperty', fields: [ households.propertyId ], references: [ properties.id ] }), profiles: helpers.many(profiles, { relationName: 'HouseholdToProfile' }) }));