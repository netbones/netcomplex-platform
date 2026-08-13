import { pgEnum } from 'drizzle-orm/pg-core';

export const visitorTypeEnum = pgEnum('VisitorType', ['WALK_IN', 'VEHICLE']);
