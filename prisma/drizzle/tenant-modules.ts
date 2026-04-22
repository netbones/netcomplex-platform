import { pgTable, text, boolean, jsonb, timestamp, varchar } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

/**
 * Per-tenant module enablement tracking.
 * Records which modules each tenant has explicitly enabled/disabled.
 *
 * @see docs/netcomplex-module-architecture-2026-04-22.md
 */
export const tenantModules = pgTable('tenant_modules', {
  id: text('id').defaultRandom().primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  moduleKey: varchar('module_key', { length: 100 }).notNull(),
  enabled: boolean('enabled').default(false),
  config: jsonb('config'),
  enabledAt: timestamp('enabled_at', { mode: 'date', precision: 3 }),
});

export type TenantModule = typeof tenantModules.$inferSelect;
