import { pgEnum } from 'drizzle-orm/pg-core';

export const providerEmploymentTypeEnum = pgEnum('ProviderEmploymentType', ['IN_HOUSE', 'EXTERNAL']);