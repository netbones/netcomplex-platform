import { pgEnum } from 'drizzle-orm/pg-core';

export const bookingPaymentStatusEnum = pgEnum('BookingPaymentStatus', [
  'PENDING',
  'COMPLETED',
  'REFUNDED',
]);
