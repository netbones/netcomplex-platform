import { pgEnum } from 'drizzle-orm/pg-core';

export const visitorStatusEnum = pgEnum('VisitorStatus', [
  'PENDING',
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
  'DENIED',
]);
