import { pgEnum } from 'drizzle-orm/pg-core';

export const accessEventMethodEnum = pgEnum('AccessEventMethod', [
  'QR',
  'CODE',
  'MANUAL',
  'ANPR',
  'INTERCOM',
  'AUTO_LIST',
]);
