import { pgEnum } from 'drizzle-orm/pg-core';

export const transactionTypeEnum = pgEnum('TransactionType', ['CREDIT', 'DEBIT', 'ROLLOVER', 'ADJUSTMENT']);