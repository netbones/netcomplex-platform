import { pgEnum } from 'drizzle-orm/pg-core';

export const addressStatusEnum = pgEnum('AddressStatus', [
  'ACTIVE',
  'RESERVED',
  'COOLING_OFF',
  'ARCHIVED',
  'DELETED',
]);
