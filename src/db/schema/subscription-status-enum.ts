import { pgEnum } from 'drizzle-orm/pg-core';

export const subscriptionStatusEnum = pgEnum('SubscriptionStatus', ['ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING']);