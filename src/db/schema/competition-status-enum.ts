import { pgEnum } from 'drizzle-orm/pg-core';

export const competitionStatusEnum = pgEnum('CompetitionStatus', ['DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED']);