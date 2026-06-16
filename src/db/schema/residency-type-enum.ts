import { pgEnum } from 'drizzle-orm/pg-core';

export const residencyTypeEnum = pgEnum('ResidencyType', ['FAMILY', 'RENTER', 'OWNER_RESIDENT']);