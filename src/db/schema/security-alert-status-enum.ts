import { pgEnum } from 'drizzle-orm/pg-core';

export const securityAlertStatusEnum = pgEnum('SecurityAlertStatus', [
  'SENT',
  'ACKNOWLEDGED',
  'RESPONDING',
  'RESOLVED',
  'FAILED',
]);
