import { relations } from 'drizzle-orm';
import { questions } from './questions';
import { surveySections } from './survey-sections';
import { surveys } from './surveys';

export const questionsRelations = relations(questions, helpers => ({
  Section: helpers.one(surveySections, {
    relationName: 'QuestionToSurveySection',
    fields: [questions.sectionId],
    references: [surveySections.id],
  }),
  Survey: helpers.one(surveys, {
    relationName: 'QuestionToSurvey',
    fields: [questions.surveyId],
    references: [surveys.id],
  }),
}));
