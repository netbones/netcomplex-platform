import { pgEnum } from 'drizzle-orm/pg-core';

export const batchStatusEnum = pgEnum('BatchStatus', ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);