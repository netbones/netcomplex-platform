import { pgEnum } from 'drizzle-orm/pg-core';

export const accessEventStateEnum = pgEnum('AccessEventState', ['GRANTED', 'DENIED', 'PENDING']);
