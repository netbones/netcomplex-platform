import { pgEnum } from 'drizzle-orm/pg-core';

export const reportReasonEnum = pgEnum('ReportReason', [
  'SPAM',
  'HARASSMENT',
  'MISINFORMATION',
  'HATE_SPEECH',
  'VIOLENCE',
  'NSFW',
  'IMPERSONATION',
  'OTHER',
]);
