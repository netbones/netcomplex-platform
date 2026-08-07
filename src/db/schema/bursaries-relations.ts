import { relations } from 'drizzle-orm';
import { bursaries } from './bursaries';
import { tenants } from './tenants';
import { bursaryFields } from './bursary-fields';

export const bursariesRelations = relations(bursaries, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'BursaryToTenant',
    fields: [bursaries.tenantId],
    references: [tenants.id],
  }),
  field: helpers.one(bursaryFields, {
    relationName: 'BursaryToBursaryField',
    fields: [bursaries.fieldId],
    references: [bursaryFields.id],
  }),
}));
