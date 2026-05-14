import { pgEnum } from 'drizzle-orm/pg-core';

export const listingTypeEnum = pgEnum('ListingType', ['SALE', 'RENT', 'LEASE']);
