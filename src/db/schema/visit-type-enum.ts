import { pgEnum } from 'drizzle-orm/pg-core';

export const visitTypeEnum = pgEnum('VisitType', ['SINGLE', 'RECURRING']);
