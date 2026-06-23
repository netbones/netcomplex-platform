import { pgEnum } from 'drizzle-orm/pg-core';

export const contentCategoryEnum = pgEnum('ContentCategory', [
  'ANNOUNCEMENT',
  'BLOG',
  'CAMPAIGN',
  'CONSERVATION',
  'EVENT',
  'LEGAL',
  'NEWS',
  'SERVICES',
]);
