import { pgEnum } from 'drizzle-orm/pg-core';

export const providerVerificationStatusEnum = pgEnum('ProviderVerificationStatus', ['PENDING', 'PROBATION', 'VERIFIED', 'SUSPENDED']);