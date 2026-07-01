import { relations } from 'drizzle-orm';
import { bursaryFields } from './bursary-fields';
import { bursaries } from './bursaries';

export const bursaryFieldsRelations = relations(bursaryFields, helpers => ({
  bursaries: helpers.many(bursaries, { relationName: 'BursaryToBursaryField' }),
}));
