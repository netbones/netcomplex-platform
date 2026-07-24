import { pgEnum } from 'drizzle-orm/pg-core';

export const proxyStatusEnum = pgEnum('ProxyStatus', [
  'Draft',
  'WaitingForUpload',
  'WaitingForProxy',
  'PendingHoaReview',
  'Approved',
  'Rejected',
  'Withdrawn',
]);
