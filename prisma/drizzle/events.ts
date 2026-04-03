import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const events = pgTable('Event', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  date: timestamp('date', { mode: 'date', precision: 3 }).notNull(),
  location: text('location').notNull(),
  organizer: text('organizer').notNull(),
  image: text('image'),
  isPublic: boolean('isPublic').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
});
