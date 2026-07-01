import { pgEnum } from 'drizzle-orm/pg-core';

export const providerMeritTypeEnum = pgEnum('ProviderMeritType', ['RESPONSE_TIME', 'SERVICE_QUALITY', 'REVIEW_RATING', 'COMPLIANCE', 'ENGAGEMENT', 'REFERENCE']);