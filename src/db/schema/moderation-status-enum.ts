import { pgEnum } from 'drizzle-orm/pg-core';

export const moderationStatusEnum = pgEnum('ModerationStatus', [
  'DRAFT',
  'PUBLISHED',
  'UNPUBLISHED',
  'FLAGGED',
]);
