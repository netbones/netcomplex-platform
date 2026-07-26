import { pgEnum } from 'drizzle-orm/pg-core';

export const commentStatusEnum = pgEnum('CommentStatus', [
  'PUBLISHED',
  'HIDDEN',
  'FLAGGED',
  'REMOVED',
]);
