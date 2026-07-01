import { pgEnum } from 'drizzle-orm/pg-core';

export const serviceBookingStatusEnum = pgEnum('ServiceBookingStatus', ['PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED']);