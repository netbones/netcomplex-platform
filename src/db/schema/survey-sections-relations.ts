import { relations } from 'drizzle-orm';
import { surveySections } from './survey-sections';
import { questions } from './questions';
import { surveys } from './surveys';

export const surveySectionsRelations = relations(surveySections, helpers => ({
  Question: helpers.many(questions, { relationName: 'QuestionToSurveySection' }),
  Survey: helpers.one(surveys, {
    relationName: 'SurveyToSurveySection',
    fields: [surveySections.surveyId],
    references: [surveys.id],
  }),
}));
