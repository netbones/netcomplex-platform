import { pgEnum } from 'drizzle-orm/pg-core';

export const providerDueDiligenceStatusEnum = pgEnum('ProviderDueDiligenceStatus', [
  'PENDING_REVIEW',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
]);
