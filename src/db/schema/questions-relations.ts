import { relations } from 'drizzle-orm';
import { questions } from './questions';
import { surveys } from './surveys';
import { surveySections } from './survey-sections';

export const questionsRelations = relations(questions, (helpers) => ({ Survey: helpers.one(surveys, { relationName: 'QuestionToSurvey', fields: [ questions.surveyId ], references: [ surveys.id ] }), Section: helpers.one(surveySections, { relationName: 'QuestionToSurveySection', fields: [ questions.sectionId ], references: [ surveySections.id ] }) }));