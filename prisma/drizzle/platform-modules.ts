import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tierEnum } from './tier-enum';

export const platformModules = pgTable('PlatformModule', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  label: text('label').notNull(),
  minTier: tierEnum('minTier').default('STANDARD').notNull(),
  defaultEnabled: boolean('defaultEnabled').default(false).notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
