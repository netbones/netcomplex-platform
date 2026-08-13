import { pgEnum } from 'drizzle-orm/pg-core';

export const securityAlertTypeEnum = pgEnum('SecurityAlertType', ['PANIC', 'ANONYMOUS_TIP']);
