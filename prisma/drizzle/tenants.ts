import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const tenants = pgTable('Tenant', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  customDomain: text('customDomain'),
  logoUrl: text('logoUrl'),
  faviconUrl: text('faviconUrl'),
  primaryColor: text('primaryColor').default('#4F46E5').notNull(),
  accentColor: text('accentColor'),
  secondaryColor: text('secondaryColor'),
  fontFamily: text('fontFamily'),
  customCss: text('customCss'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }),
});
