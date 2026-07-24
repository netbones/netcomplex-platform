import { relations } from 'drizzle-orm';
import { dataRevenueStreams } from './data-revenue-streams';
import { tenants } from './tenants';

export const dataRevenueStreamsRelations = relations(dataRevenueStreams, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'DataRevenueStreamToTenant', fields: [ dataRevenueStreams.tenantId ], references: [ tenants.id ] }) }));