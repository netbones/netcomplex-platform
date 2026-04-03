import { relations } from 'drizzle-orm';
import { responses } from './responses';
import { surveys } from './surveys';

export const responsesRelations = relations(responses, (helpers) => ({ Survey: helpers.one(surveys, { relationName: 'ResponseToSurvey', fields: [ responses.surveyId ], references: [ surveys.id ] }) }));