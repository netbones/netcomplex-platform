import { pgEnum } from 'drizzle-orm/pg-core';

export const joinRequestStatusEnum = pgEnum('JoinRequestStatus', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
]);
