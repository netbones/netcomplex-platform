import { pgTable, text, integer, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { resourceCategoryEnum } from './resource-category-enum';
import { resourceVisibilityEnum } from './resource-visibility-enum';
import { resourceMediaTypeEnum } from './resource-media-type-enum';

export const resources = pgTable('Resource', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  category: resourceCategoryEnum('category').notNull(),
  fileUrl: text('fileUrl'),
  fileType: text('fileType'),
  fileSize: integer('fileSize'),
  externalUrl: text('externalUrl'),
  bodyContent: jsonb('bodyContent'),
  version: text('version'),
  downloadCount: integer('downloadCount').default(0).notNull(),
  visibility: resourceVisibilityEnum('visibility').default('ALL_RESIDENTS').notNull(),
  authorId: text('authorId'),
  publishedAt: timestamp('publishedAt', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
  featured: boolean('featured').default(false).notNull(),
  mediaType: resourceMediaTypeEnum('mediaType'),
  provider: text('provider'),
  tags: text('tags').array().default([]).notNull(),
});
