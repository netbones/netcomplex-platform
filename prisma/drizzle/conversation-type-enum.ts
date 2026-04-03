import { pgEnum } from 'drizzle-orm/pg-core';

export const conversationTypeEnum = pgEnum('ConversationType', ['DIRECT', 'GROUP']);
