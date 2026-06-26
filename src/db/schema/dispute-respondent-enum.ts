import { pgEnum } from 'drizzle-orm/pg-core';

export const disputeRespondentEnum = pgEnum('DisputeRespondent', [
  'RESIDENT',
  'HOA',
  'BOARD_MEMBER',
  'TENANT_PROVIDER',
]);
