import { pgEnum } from 'drizzle-orm/pg-core';

export const tierEnum = pgEnum('Tier', ['STANDARD', 'PREMIUM', 'ENTERPRISE']);