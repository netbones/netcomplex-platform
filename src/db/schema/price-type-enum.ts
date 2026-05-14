import { pgEnum } from 'drizzle-orm/pg-core';

export const priceTypeEnum = pgEnum('PriceType', ['FIXED', 'HOURLY', 'QUOTE', 'FREE']);
