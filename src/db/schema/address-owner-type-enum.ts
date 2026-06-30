import { pgEnum } from 'drizzle-orm/pg-core';

export const addressOwnerTypeEnum = pgEnum('AddressOwnerType', [
  'STANDARD_SEAT',
  'PROFILE',
  'SOLO_SEAT',
  'PREMIUM_SEAT',
  'PROPERTY',
  'PROVIDER',
  'SYSTEM',
]);
