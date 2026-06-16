import { pgEnum } from 'drizzle-orm/pg-core';

export const groupAccessEnum = pgEnum('GroupAccess', ['OPEN', 'INVITE_ONLY', 'APPLICATION']);