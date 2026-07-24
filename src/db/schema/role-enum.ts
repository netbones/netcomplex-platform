import { pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('Role', ['RESIDENT', 'GROUP_ADMIN', 'COMMITTEE', 'BOARD', 'ADMIN', 'AGENT', 'MANAGER', 'ASSOCIATE', 'PROVIDER', 'USER']);