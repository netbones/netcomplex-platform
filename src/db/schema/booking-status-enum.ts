import { pgEnum } from 'drizzle-orm/pg-core';

export const bookingStatusEnum = pgEnum('BookingStatus', ['CONFIRMED', 'CANCELLED', 'COMPLETED']);
