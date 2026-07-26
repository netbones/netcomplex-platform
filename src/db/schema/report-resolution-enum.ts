import { pgEnum } from 'drizzle-orm/pg-core';

export const reportResolutionEnum = pgEnum('ReportResolution', [
  'DISMISSED',
  'COMMENT_REMOVED',
  'USER_WARNED',
  'USER_SUSPENDED',
]);
