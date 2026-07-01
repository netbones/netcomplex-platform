import { pgEnum } from 'drizzle-orm/pg-core';

export const payoutStatusEnum = pgEnum('PayoutStatus', ['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED']);