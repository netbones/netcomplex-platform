import { pgEnum } from 'drizzle-orm/pg-core';

export const agentAccessLevelEnum = pgEnum('AgentAccessLevel', ['VIEW_ONLY', 'MANAGEMENT', 'FULL_ACCESS']);