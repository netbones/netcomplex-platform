import { pgEnum } from 'drizzle-orm/pg-core';

export const agentPermissionEnum = pgEnum('AgentPermission', ['VIEW_LISTING', 'EDIT_LISTING', 'MANAGE_OCCUPANCY', 'VIEW_FINANCIALS', 'CONTACT_OCCUPANTS', 'MARKET_PROPERTY']);