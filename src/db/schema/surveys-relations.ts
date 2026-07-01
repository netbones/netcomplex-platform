import { relations } from 'drizzle-orm';
import { surveys } from './surveys';
import { questions } from './questions';
import { responses } from './responses';
import { surveySections } from './survey-sections';

export const surveysRelations = relations(surveys, helpers => ({
  Question: helpers.many(questions, { relationName: 'QuestionToSurvey' }),
  Response: helpers.many(responses, { relationName: 'ResponseToSurvey' }),
  SurveySection: helpers.many(surveySections, { relationName: 'SurveyToSurveySection' }),
}));
