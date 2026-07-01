import { pgEnum } from 'drizzle-orm/pg-core';

export const maintenanceRoutingEnum = pgEnum('MaintenanceRouting', ['HOA', 'LANDLORD']);