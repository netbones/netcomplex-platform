import { pgEnum } from 'drizzle-orm/pg-core';

export const disputeSeverityEnum = pgEnum('DisputeSeverity', [
  'MINOR',
  'MODERATE',
  'SERIOUS',
  'URGENT',
]);
