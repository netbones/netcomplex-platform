import { pgEnum } from 'drizzle-orm/pg-core';

export const securityContactTypeEnum = pgEnum('SecurityContactType', [
  'INTERNAL_SECURITY',
  'EMERGENCY_SERVICES',
  'ARMED_RESPONSE',
]);
