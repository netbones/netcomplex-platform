import { db, tenantModules } from '@api/server';
import { eq, and } from 'drizzle-orm';

/**
 * Get a tenant's module record by tenantId and moduleKey.
 *
 * Returns the full TenantModule row (including config JSON) or null if no
 * explicit record exists for this tenant (module not activated).
 */
export async function getTenantModule(tenantId: string, moduleKey: string) {
  const result = await db
    .select()
    .from(tenantModules)
    .where(and(eq(tenantModules.tenantId, tenantId), eq(tenantModules.moduleKey, moduleKey)))
    .limit(1);
  return result[0] ?? null;
}
