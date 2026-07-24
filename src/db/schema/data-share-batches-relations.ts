import { relations } from 'drizzle-orm';
import { dataShareBatches } from './data-share-batches';
import { tenants } from './tenants';

export const dataShareBatchesRelations = relations(dataShareBatches, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'DataShareBatchToTenant', fields: [ dataShareBatches.tenantId ], references: [ tenants.id ] }) }));