import { pgEnum } from 'drizzle-orm/pg-core';

export const handleStatusEnum = pgEnum('HandleStatus', ['ACTIVE', 'RESERVED', 'RELEASED']);
