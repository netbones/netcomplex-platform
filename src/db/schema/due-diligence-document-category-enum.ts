import { pgEnum } from 'drizzle-orm/pg-core';

export const dueDiligenceDocumentCategoryEnum = pgEnum('DueDiligenceDocumentCategory', [
  'IDENTITY_DOC',
  'BUSINESS_LICENSE',
  'INSURANCE',
  'REFERENCE',
  'OTHER',
]);
