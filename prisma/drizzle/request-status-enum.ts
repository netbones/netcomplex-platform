import { pgEnum } from 'drizzle-orm/pg-core';

export const requestStatusEnum = pgEnum('RequestStatus', ['SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);