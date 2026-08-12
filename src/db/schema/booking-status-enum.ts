import { pgEnum } from 'drizzle-orm/pg-core';

export const bookingStatusEnum = pgEnum('BookingStatus', [
  'CONFIRMED',
  'WAITLISTED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
]);
