import { pgEnum } from 'drizzle-orm/pg-core';

export const conversationTypeEnum = pgEnum('ConversationType', ['DIRECT', 'GROUP', 'SECURE_DIRECT', 'SECURE_GROUP']);