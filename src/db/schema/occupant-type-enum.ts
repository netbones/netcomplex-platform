import { pgEnum } from 'drizzle-orm/pg-core';

export const occupantTypeEnum = pgEnum('OccupantType', ['OCCUPANT', 'MINOR', 'FAMILY']);