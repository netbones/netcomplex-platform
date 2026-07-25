import { pgEnum } from 'drizzle-orm/pg-core';

export const dueDiligenceItemStatusEnum = pgEnum('DueDiligenceItemStatus', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);
