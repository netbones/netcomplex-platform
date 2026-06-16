import { pgEnum } from 'drizzle-orm/pg-core';

export const surveyStatusEnum = pgEnum('SurveyStatus', ['DRAFT', 'ACTIVE', 'CLOSED']);