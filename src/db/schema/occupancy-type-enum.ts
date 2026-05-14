import { pgEnum } from 'drizzle-orm/pg-core';

export const occupancyTypeEnum = pgEnum('OccupancyType', ['OWNER_OCCUPIED', 'RENTAL', 'VACANT']);
