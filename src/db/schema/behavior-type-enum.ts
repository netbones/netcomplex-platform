import { pgEnum } from 'drizzle-orm/pg-core';

export const behaviorTypeEnum = pgEnum('BehaviorType', ['MERIT', 'WARNING', 'INFRACTION']);