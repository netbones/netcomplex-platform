import { pgEnum } from 'drizzle-orm/pg-core';

export const residentTypeEnum = pgEnum('ResidentType', ['OWNER', 'RENTER', 'SUSPENDED']);
