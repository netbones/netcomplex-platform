import { pgEnum } from 'drizzle-orm/pg-core';

export const suspensionTypeEnum = pgEnum('SuspensionType', [
  'NON_PAYMENT',
  'VIOLATION',
  'DISRUPTION',
  'PROPERTY',
  'BEHAVIOR',
  'OTHER',
]);
