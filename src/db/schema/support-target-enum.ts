import { pgEnum } from 'drizzle-orm/pg-core';

export const supportTargetEnum = pgEnum('SupportTarget', [
  'CONTENT',
  'RESOURCE',
  'EVENT',
  'GROUP',
  'SERVICE',
  'PROJECT',
  'CAMPAIGN',
  'PROFILE',
]);
