import { pgEnum } from 'drizzle-orm/pg-core';

export const priorityEnum = pgEnum('Priority', ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']);
