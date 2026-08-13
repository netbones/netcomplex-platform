import { pgEnum } from 'drizzle-orm/pg-core';

export const accessRequestStatusEnum = pgEnum('AccessRequestStatus', [
  'PENDING',
  'ALLOWED',
  'DENIED',
  'EXPIRED',
]);
