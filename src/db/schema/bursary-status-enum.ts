import { pgEnum } from 'drizzle-orm/pg-core';

export const bursaryStatusEnum = pgEnum('BursaryStatus', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);
