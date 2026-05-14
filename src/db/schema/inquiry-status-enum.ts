import { pgEnum } from 'drizzle-orm/pg-core';

export const inquiryStatusEnum = pgEnum('InquiryStatus', [
  'PENDING',
  'RESPONDED',
  'ACCEPTED',
  'DECLINED',
  'COMPLETED',
  'CANCELLED',
]);
