import { pgEnum } from 'drizzle-orm/pg-core';

export const groupRoleEnum = pgEnum('GroupRole', ['MEMBER', 'MODERATOR', 'ADMIN']);
