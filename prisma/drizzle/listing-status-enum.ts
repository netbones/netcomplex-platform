import { pgEnum } from 'drizzle-orm/pg-core';

export const listingStatusEnum = pgEnum('ListingStatus', ['DRAFT', 'ACTIVE', 'PENDING', 'SOLD', 'RENTED', 'WITHDRAWN']);