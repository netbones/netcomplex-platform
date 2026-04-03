import { pgEnum } from 'drizzle-orm/pg-core';

export const soloSeatTypeEnum = pgEnum('SoloSeatType', ['RESIDENT', 'MEMBER']);
