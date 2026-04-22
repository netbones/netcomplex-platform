import { pgEnum, pgTable, text, boolean, timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * Tier levels for NetComplex module architecture.
 * Determines minimum tier required for a module to be accessible.
 */
export const tierEnum = pgEnum('tier', ['standard', 'premium', 'enterprise']);

/**
 * Platform-wide module registry.
 * Defines every module NetComplex offers and its minimum tier requirement.
 *
 * @see docs/netcomplex-module-architecture-2026-04-22.md
 */
export const platformModules = pgTable('platform_modules', {
  id: text('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  label: varchar('label', { length: 255 }).notNull(),
  minTier: tierEnum('min_tier').default('standard').notNull(),
  defaultEnabled: boolean('default_enabled').default(false),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});

export type PlatformModule = typeof platformModules.$inferSelect;
