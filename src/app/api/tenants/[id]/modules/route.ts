/**
 * GET /api/tenants/[id]/modules
 *
 * Returns enabled modules for a tenant based on tier + explicit settings
 */

import { requireAuth } from '@/shared/api/auth-utils';
import {
  db,
  tenantModules,
  platformModules,
  tenants,
  apiSuccess,
  apiInternalError,
  apiNotFound,
} from '@api/server';

import { eq, desc } from 'drizzle-orm';
import type { TenantTier } from '@shared/lib';
import { apiLogger } from '@shared/lib';

export const maxDuration = 8;

const TIER_ORDER: Record<TenantTier, number> = {
  STANDARD: 1,
  PREMIUM: 2,
  ENTERPRISE: 3,
};

/**
 * @deprecated Use trpc.platform.listTenantModules instead.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const { id: tenantId } = await params;

  try {
    // Get tenant tier
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

    if (!tenant) {
      return apiNotFound('Tenant not found');
    }

    const tenantTierLevel = TIER_ORDER[tenant.tier] ?? 0;

    // Get all platform modules
    const allModules = await db
      .select()
      .from(platformModules)
      .orderBy(desc(platformModules.minTier));

    // Get tenant's explicit module settings
    const tenantModuleRows = await db
      .select()
      .from(tenantModules)
      .where(eq(tenantModules.tenantId, tenantId));

    const tenantModuleMap = new Map(tenantModuleRows.map(m => [m.moduleKey, m]));

    // Build response
    const enabled: Record<string, { enabled: boolean; config?: unknown; enabledAt?: string }> = {};

    for (const mod of allModules) {
      const moduleTierLevel = TIER_ORDER[mod.minTier] ?? 0;

      // Check tier requirement
      if (tenantTierLevel < moduleTierLevel) {
        continue;
      }

      // Check explicit settings
      const tenantMod = tenantModuleMap.get(mod.key);
      const isEnabled = tenantMod?.enabled ?? mod.defaultEnabled;

      enabled[mod.key] = {
        enabled: isEnabled,
        config: tenantMod?.config ?? undefined,
        enabledAt: tenantMod?.enabledAt?.toISOString() ?? undefined,
      };
    }

    return apiSuccess(enabled);
  } catch (error) {
    apiLogger.error({ error }, 'Failed to fetch tenant modules');
    return apiInternalError('Failed to fetch modules');
  }
}
