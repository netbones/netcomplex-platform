import { relations } from 'drizzle-orm';
import { bursaryFields } from './bursary-fields';
import { tenants } from './tenants';
import { bursaries } from './bursaries';

export const bursaryFieldsRelations = relations(bursaryFields, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'BursaryFieldToTenant',
    fields: [bursaryFields.tenantId],
    references: [tenants.id],
  }),
  bursaries: helpers.many(bursaries, { relationName: 'BursaryToBursaryField' }),
}));
