import { NextRequest } from 'next/server';
import {
  getPlatformPageFlagsWithTx,
  setPlatformPageFlagWithTx,
  type PlatformPageFlags,
} from '@entities/tenant/server';
import {
  getSessionAndRole,
  runWithRLS,
  getRLSContext,
  apiError,
  apiForbidden,
  apiSuccess,
  apiInternalError,
  apiUnauthorized,
  writeAuditLog,
  rateLimitByUser,
  CACHE_TAGS,
} from '@api/server';
import { revalidateTag } from 'next/cache';

import { hasPermission } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 8;

const log = createComponentLogger('page-flags-api');

export async function GET(request: NextRequest) {
  try {
    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    return runWithRLS(ctx, async tx => {
      const flags = await getPlatformPageFlagsWithTx(tx, ctx.tenantId);
      return apiSuccess(flags);
    });
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to get page flags', error);
    return apiInternalError(String(error));
  }
}

const VALID_KEYS: (keyof PlatformPageFlags)[] = [
  'campaign',
  'conservation',
  'conservationExternalUrl',
  'chat',
  'education',
  'news',
  'events',
  'directory',
  'groups',
  'services',
  'resources',
  'maintenance',
  'surveys',
  'competitions',
  'dashboard',
  'bookings',
  'messages',
  'headerLinks',
];

export async function POST(request: NextRequest) {
  try {
    const sessionRole = await getSessionAndRole();
    if (!sessionRole || !hasPermission(sessionRole.role, 'admin')) {
      return apiForbidden();
    }

    const rateLimit = await rateLimitByUser(sessionRole.userId, {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (rateLimit) return rateLimit;

    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    const body = await request.json();
    const { key, value } = body as {
      key: keyof PlatformPageFlags;
      value: string | boolean | string[];
    };

    if (!VALID_KEYS.includes(key)) {
      return apiError('VALIDATION_ERROR', 'Invalid key', 400);
    }

    const result = await runWithRLS(ctx, async tx => {
      const flags = await getPlatformPageFlagsWithTx(tx, ctx.tenantId);
      const oldValue = flags[key] ?? null;
      const success = await setPlatformPageFlagWithTx(tx, ctx.tenantId, key, value);
      return { success, oldValue };
    });

    if (result.success) {
      writeAuditLog({
        action: 'SETTINGS_CHANGED',
        actorId: sessionRole.userId,
        tenantId: ctx.tenantId,
        details: { key, oldValue: result.oldValue, newValue: value, method: 'POST' },
      });
      revalidateTag(CACHE_TAGS.SETTINGS);
      return apiSuccess({ success: true, key, value });
    }

    return apiInternalError('Failed to update');
  } catch (error) {
    log.error({ operation: 'POST' }, 'Failed to update page flag', error);
    return apiInternalError(String(error));
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionRole = await getSessionAndRole();
    if (!sessionRole || !hasPermission(sessionRole.role, 'admin')) {
      return apiForbidden();
    }

    const rateLimit = await rateLimitByUser(sessionRole.userId, {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (rateLimit) return rateLimit;

    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    const body = (await request.json()) as Record<string, unknown>;

    const { results, changes } = await runWithRLS(ctx, async tx => {
      const flags = await getPlatformPageFlagsWithTx(tx, ctx.tenantId);
      const results: { key: string; success: boolean }[] = [];
      const changes: { key: string; oldValue: unknown; newValue: unknown }[] = [];

      for (const [key, value] of Object.entries(body)) {
        if (!VALID_KEYS.includes(key as keyof PlatformPageFlags)) {
          results.push({ key, success: false });
          continue;
        }

        const success = await setPlatformPageFlagWithTx(
          tx,
          ctx.tenantId,
          key as keyof PlatformPageFlags,
          value as string | boolean | string[]
        );
        if (success) {
          changes.push({
            key,
            oldValue: flags[key as keyof PlatformPageFlags] ?? null,
            newValue: value,
          });
        }
        results.push({ key, success });
      }

      return { results, changes };
    });

    for (const change of changes) {
      writeAuditLog({
        action: 'SETTINGS_CHANGED',
        actorId: sessionRole.userId,
        tenantId: ctx.tenantId,
        details: { ...change, method: 'PUT' },
      });
    }

    revalidateTag(CACHE_TAGS.SETTINGS);
    return apiSuccess({ results });
  } catch (error) {
    log.error({ operation: 'PUT' }, 'Failed to batch update page flags', error);
    return apiInternalError(String(error));
  }
}
