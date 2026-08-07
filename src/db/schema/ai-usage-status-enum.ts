import { pgEnum } from 'drizzle-orm/pg-core';

export const aiUsageStatusEnum = pgEnum('AiUsageStatus', ['ACTIVE', 'SETTLED', 'OVERRIDDEN']);
