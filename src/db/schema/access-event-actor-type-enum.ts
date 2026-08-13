import { pgEnum } from 'drizzle-orm/pg-core';

export const accessEventActorTypeEnum = pgEnum('AccessEventActorType', [
  'RESIDENT',
  'MANAGER',
  'AUTO_LIST',
  'AUTO_DENY',
  'GUARD',
  'AWAITING_RESIDENT',
]);
