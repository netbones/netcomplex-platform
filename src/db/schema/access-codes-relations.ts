import { relations } from 'drizzle-orm';
import { accessCodes } from './access-codes';
import { tenants } from './tenants';
import { visitors } from './visitors';

export const accessCodesRelations = relations(accessCodes, helpers => ({
  tenant: helpers.one(tenants, {
    relationName: 'AccessCodeToTenant',
    fields: [accessCodes.tenantId],
    references: [tenants.id],
  }),
  visitor: helpers.one(visitors, {
    relationName: 'AccessCodeToVisitor',
    fields: [accessCodes.visitorId],
    references: [visitors.id],
  }),
}));
