import { pgEnum } from 'drizzle-orm/pg-core';

export const resourceVisibilityEnum = pgEnum('ResourceVisibility', [
  'ALL_RESIDENTS',
  'OWNERS_ONLY',
  'BOARD_ONLY',
  'COMMITTEE_ONLY',
]);
