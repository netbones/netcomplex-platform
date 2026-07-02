import { relations } from 'drizzle-orm';
import { surveySections } from './survey-sections';
import { tenants } from './tenants';
import { questions } from './questions';
import { surveys } from './surveys';

export const surveySectionsRelations = relations(surveySections, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'SurveySectionToTenant',
    fields: [surveySections.tenantId],
    references: [tenants.id],
  }),
  Question: helpers.many(questions, { relationName: 'QuestionToSurveySection' }),
  Survey: helpers.one(surveys, {
    relationName: 'SurveyToSurveySection',
    fields: [surveySections.surveyId],
    references: [surveys.id],
  }),
}));
