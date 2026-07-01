import { pgEnum } from 'drizzle-orm/pg-core';

export const providerChargeStatusEnum = pgEnum('ProviderChargeStatus', ['PENDING', 'PAID', 'FAILED']);