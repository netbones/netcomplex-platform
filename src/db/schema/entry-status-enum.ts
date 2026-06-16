import { pgEnum } from 'drizzle-orm/pg-core';

export const entryStatusEnum = pgEnum('EntryStatus', ['JOINED', 'WITHDRAWN', 'WINNER', 'RUNNER_UP']);