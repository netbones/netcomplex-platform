import { pgEnum } from 'drizzle-orm/pg-core';

export const addressKindEnum = pgEnum('AddressKind', [
  'STANDARD',
  'ALIAS',
  'SOLO',
  'PREMIUM',
  'PROVIDER',
  'SYSTEM',
]);
