import { pgEnum } from 'drizzle-orm/pg-core';

export const contentCategoryEnum = pgEnum('ContentCategory', [
  'ANNOUNCEMENT',
  'NEWS',
  'EVENT',
  'BLOG',
  'CONSERVATION',
  'SERVICES',
  'RESOURCES',
  'CAMPAIGN',
]);
