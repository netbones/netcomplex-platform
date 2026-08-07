import { pgEnum } from 'drizzle-orm/pg-core';

export const profileStatusEnum = pgEnum('ProfileStatus', [
  'ACTIVE',
  'UPGRADED',
  'REMOVED',
  'EVICTED',
  'LEASE_ENDED',
]);
