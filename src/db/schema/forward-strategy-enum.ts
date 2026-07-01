import { pgEnum } from 'drizzle-orm/pg-core';

export const forwardStrategyEnum = pgEnum('ForwardStrategy', ['DIRECT', 'HOUSEHOLD']);