import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { dueDiligenceDocumentCategoryEnum } from './due-diligence-document-category-enum';

export const providerDueDiligenceDocuments = pgTable('ProviderDueDiligenceDocument', {
  id: text('id').primaryKey(),
  workflowId: text('workflowId').notNull(),
  itemId: text('itemId'),
  fileName: text('fileName').notNull(),
  fileType: text('fileType').notNull(),
  storageKey: text('storageKey').notNull(),
  category: dueDiligenceDocumentCategoryEnum('category').default('OTHER').notNull(),
  uploadedBy: text('uploadedBy').notNull(),
  fileSize: integer('fileSize'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
