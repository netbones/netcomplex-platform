import { relations } from 'drizzle-orm';
import { surveySections } from './survey-sections';
import { surveys } from './surveys';
import { questions } from './questions';

export const surveySectionsRelations = relations(surveySections, helpers => ({
  Survey: helpers.one(surveys, {
    relationName: 'SurveyToSurveySection',
    fields: [surveySections.surveyId],
    references: [surveys.id],
  }),
  Question: helpers.many(questions, { relationName: 'QuestionToSurveySection' }),
}));
