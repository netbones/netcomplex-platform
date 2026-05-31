import { pgEnum } from 'drizzle-orm/pg-core';

export const competitionTypeEnum = pgEnum('CompetitionType', ['RAFFLE', 'PHOTO', 'SCORE']);
