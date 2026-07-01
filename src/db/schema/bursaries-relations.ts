import { relations } from 'drizzle-orm';
import { bursaries } from './bursaries';
import { bursaryFields } from './bursary-fields';

export const bursariesRelations = relations(bursaries, (helpers) => ({ field: helpers.one(bursaryFields, { relationName: 'BursaryToBursaryField', fields: [ bursaries.fieldId ], references: [ bursaryFields.id ] }) }));