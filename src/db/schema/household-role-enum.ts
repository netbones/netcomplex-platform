import { pgEnum } from 'drizzle-orm/pg-core';

export const householdRoleEnum = pgEnum('HouseholdRole', ['OCCUPANT', 'MINOR', 'FAMILY']);
