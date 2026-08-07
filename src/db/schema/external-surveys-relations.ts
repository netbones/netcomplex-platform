import { relations } from 'drizzle-orm';
import { externalSurveys } from './external-surveys';
import { tenants } from './tenants';

export const externalSurveysRelations = relations(externalSurveys, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'ExternalSurveyToTenant',
    fields: [externalSurveys.tenantId],
    references: [tenants.id],
  }),
}));
