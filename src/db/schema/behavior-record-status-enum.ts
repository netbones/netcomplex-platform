import { pgEnum } from 'drizzle-orm/pg-core';

export const behaviorRecordStatusEnum = pgEnum('BehaviorRecordStatus', ['ACTIVE', 'DISPUTED', 'UPHELD', 'OVERTURNED']);