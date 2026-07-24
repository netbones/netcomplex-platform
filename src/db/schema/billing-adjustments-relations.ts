import { relations } from 'drizzle-orm';
import { billingAdjustments } from './billing-adjustments';
import { tenants } from './tenants';

export const billingAdjustmentsRelations = relations(billingAdjustments, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'BillingAdjustmentToTenant', fields: [ billingAdjustments.tenantId ], references: [ tenants.id ] }) }));