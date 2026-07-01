import { pgEnum } from 'drizzle-orm/pg-core';

export const transactionStatusEnum = pgEnum('TransactionStatus', ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);