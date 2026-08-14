import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const events = pgTable('Event', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  date: timestamp('date', { mode: 'date', precision: 3 }).notNull(),
  endDate: timestamp('endDate', { mode: 'date', precision: 3 }),
  location: text('location').notNull(),
  organizer: text('organizer').notNull(),
  image: text('image'),
  isPublic: boolean('isPublic').default(true).notNull(),
  isDraft: boolean('isDraft').default(false).notNull(),
  category: text('category'),
  maxAttendees: integer('maxAttendees'),
  createdByUserId: text('createdByUserId'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
