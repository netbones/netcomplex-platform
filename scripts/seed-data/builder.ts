/**
 * Seed-data builder helpers.
 *
 * The tenant data files (e.g. `soralia-village.ts`) contain the meaningful
 * fields only — they do NOT include `tenantId`, `createdAt`, `updatedAt`,
 * `isActive`, `isPublic`, or any other boilerplate that the database
 * generates. This module is responsible for stamping those fields on the
 * way into the database.
 *
 * Why a builder? It keeps the data files declarative and easy to diff,
 * and ensures no tenant data ever carries a stale `tenantId` if you
 * copy-paste between seed files.
 *
 * ## ID prefixing
 *
 * Primary keys are global to the database (not scoped per tenant), so two
 * tenants cannot both seed a record with `id: 'user-john-smith'`. The
 * orchestrator prefixes every entity's `id` with the tenant slug before
 * insert (`soralia-user-john-smith`, `soralia-heights-user-john-smith`).
 * Foreign keys in tenant data files use the raw, un-prefixed IDs — the
 * orchestrator applies the same prefixing pass across all entities, so
 * the references stay consistent.
 */

/**
 * Properties whose values are foreign-key references to other seed entities
 * (and therefore need the same `slug-` prefix as the entity's own `id`).
 * `tenantId` is intentionally excluded — it gets a UUID, not a slug prefix.
 */
const FOREIGN_KEY_FIELDS = new Set([
  'userId',
  'householdId',
  'propertyId',
  'profileId',
  'groupId',
  'listingId',
  'reviewerId',
  'surveyId',
  'questionId',
  'authorId',
  'ownerId',
  'assignedTeamId',
  'assignedProviderId',
  'providerId',
]);

/**
 * Prefix every entity's `id` with the tenant slug, and apply the same
 * prefix to all recognised foreign-key fields (e.g. `userId`,
 * `householdId`). The data files can then use raw, un-prefixed IDs in
 * both primary and foreign keys, and the orchestrator normalises them
 * at insert time.
 *
 * Example: with slug `soralia`,
 *   { id: 'user-john-smith', groupId: 'group-gardening' }
 * becomes
 *   { id: 'soralia-user-john-smith', groupId: 'soralia-group-gardening' }
 */
export function withTenantPrefix<T extends { id: string }>(tenantSlug: string, records: T[]): T[] {
  return records.map(r => {
    const out: Record<string, unknown> = { ...r, id: `${tenantSlug}-${r.id}` };
    for (const field of FOREIGN_KEY_FIELDS) {
      if (typeof r[field as keyof T] === 'string') {
        out[field] = `${tenantSlug}-${r[field as keyof T] as string}`;
      }
    }
    return out as T;
  });
}

/**
 * Stamp tenantId onto a list of records. All records in
 * `seed-drizzle.ts` use `.onConflictDoNothing()` (primary-key idempotency),
 * so re-running the seed is safe.
 */
export function withTenantId<T extends object>(
  tenantId: string,
  records: T[]
): Array<T & { tenantId: string }> {
  return records.map(r => ({ ...r, tenantId }));
}

/**
 * Combined transform: prefix `id` with tenant slug AND stamp `tenantId`.
 * The standard pass for any list of seeded entities.
 */
export function stamp<T extends { id: string }>(
  tenantSlug: string,
  tenantId: string,
  records: T[]
): Array<T & { tenantId: string }> {
  return withTenantId(tenantId, withTenantPrefix(tenantSlug, records));
}

/**
 * Generate a tenant UUID. Postgres `text` columns don't auto-generate
 * UUIDs, so the orchestrator must produce one before insert.
 */
export function newTenantId(): string {
  return crypto.randomUUID();
}

/**
 * Re-export for use inside tenant data files when they need to compute
 * relative dates (e.g. maintenance requests with "3 days ago" timestamps).
 */
export const seedNow = new Date();
