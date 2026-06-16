import { pgEnum } from 'drizzle-orm/pg-core';

export const questionTypeEnum = pgEnum('QuestionType', ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT', 'RATING', 'YES_NO', 'LINEAR_SCALE']);