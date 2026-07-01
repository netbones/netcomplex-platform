import { pgEnum } from 'drizzle-orm/pg-core';

export const resourceMediaTypeEnum = pgEnum('ResourceMediaType', [
  'BOOK',
  'COURSE',
  'JOURNAL',
  'VIDEO',
]);
