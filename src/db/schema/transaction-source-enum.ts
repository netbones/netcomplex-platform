import { pgEnum } from 'drizzle-orm/pg-core';

export const transactionSourceEnum = pgEnum('TransactionSource', [
  'RESIDENT_DATA_SHARE',
  'COMMUNITY_MERITS',
  'REFERRAL_REWARD',
  'VOLUNTEER_CREDIT',
  'AI_CREDIT',
  'MARKETPLACE_CREDIT',
  'COMMUNITY_SUPPORT',
]);
