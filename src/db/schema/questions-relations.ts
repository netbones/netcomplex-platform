import { relations } from 'drizzle-orm';
import { questions } from './questions';
import { tenants } from './tenants';
import { surveySections } from './survey-sections';
import { surveys } from './surveys';

export const questionsRelations = relations(questions, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'QuestionToTenant', fields: [ questions.tenantId ], references: [ tenants.id ] }), Section: helpers.one(surveySections, { relationName: 'QuestionToSurveySection', fields: [ questions.sectionId ], references: [ surveySections.id ] }), Survey: helpers.one(surveys, { relationName: 'QuestionToSurvey', fields: [ questions.surveyId ], references: [ surveys.id ] }) }));