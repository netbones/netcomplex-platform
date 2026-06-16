import { pgEnum } from 'drizzle-orm/pg-core';

export const householdStatusEnum = pgEnum('HouseholdStatus', ['ACTIVE', 'ARCHIVED']);