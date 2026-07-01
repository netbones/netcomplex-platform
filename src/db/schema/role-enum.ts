import { pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('Role', ['USER', 'RESIDENT', 'GROUP_ADMIN', 'COMMITTEE', 'BOARD', 'ADMIN', 'AGENT', 'MANAGER', 'ASSOCIATE', 'PROVIDER']);