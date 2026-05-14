import { pgTable, text, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';
import { contentCategoryEnum } from './content-category-enum';

export const contents = pgTable('Content', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  title: jsonb('title').notNull(),
  content: jsonb('content').notNull(),
  excerpt: jsonb('excerpt'),
  image: text('image'),
  category: contentCategoryEnum('category').notNull(),
  tags: text('tags').array().notNull(),
  authorId: text('authorId'),
  groupId: text('groupId'),
  published: boolean('published').default(false).notNull(),
  featured: boolean('featured').default(false).notNull(),
  priority: text('priority').default('normal').notNull(),
  defaultLocale: text('defaultLocale').default('en').notNull(),
  contentType: text('contentType').default('article').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  publishedAt: timestamp('publishedAt', { mode: 'date', precision: 3 }),
  expiresAt: timestamp('expiresAt', { mode: 'date', precision: 3 }),
});
