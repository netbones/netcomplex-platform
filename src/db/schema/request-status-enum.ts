import { pgEnum } from 'drizzle-orm/pg-core';

export const requestStatusEnum = pgEnum('RequestStatus', [
  'SUBMITTED',
  'ASSIGNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'PENDING_PARTS',
  'COMPLETED',
  'CANCELLED',
]);
