import { pgTable, text } from 'drizzle-orm/pg-core';

export const settings = pgTable('Setting', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  value: text('value').notNull(),
});
