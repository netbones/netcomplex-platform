import { relations } from 'drizzle-orm';
import { questions } from './questions';
import { surveys } from './surveys';

export const questionsRelations = relations(questions, (helpers) => ({ Survey: helpers.one(surveys, { relationName: 'QuestionToSurvey', fields: [ questions.surveyId ], references: [ surveys.id ] }) }));