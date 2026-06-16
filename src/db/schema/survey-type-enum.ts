import { pgEnum } from 'drizzle-orm/pg-core';

export const surveyTypeEnum = pgEnum('SurveyType', ['INTERNAL', 'EXTERNAL']);