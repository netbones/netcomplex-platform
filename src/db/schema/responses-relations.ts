import { relations } from 'drizzle-orm';
import { responses } from './responses';
import { tenants } from './tenants';
import { surveys } from './surveys';

export const responsesRelations = relations(responses, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'ResponseToTenant', fields: [ responses.tenantId ], references: [ tenants.id ] }), Survey: helpers.one(surveys, { relationName: 'ResponseToSurvey', fields: [ responses.surveyId ], references: [ surveys.id ] }) }));