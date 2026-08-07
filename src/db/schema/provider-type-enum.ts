import { pgEnum } from 'drizzle-orm/pg-core';

export const providerTypeEnum = pgEnum('ProviderType', ['COMMUNITY', 'THIRD_PARTY']);
