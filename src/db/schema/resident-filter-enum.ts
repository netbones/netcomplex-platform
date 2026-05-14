import { pgEnum } from 'drizzle-orm/pg-core';

export const residentFilterEnum = pgEnum('ResidentFilter', ['ALL', 'OWNERS_ONLY', 'RENTERS_ONLY']);
