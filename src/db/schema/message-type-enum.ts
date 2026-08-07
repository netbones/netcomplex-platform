import { pgEnum } from 'drizzle-orm/pg-core';

export const messageTypeEnum = pgEnum('MessageType', ['TEXT', 'IMAGE', 'SYSTEM', 'VOICE', 'FILE']);
