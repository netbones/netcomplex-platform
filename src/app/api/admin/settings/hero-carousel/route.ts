import { NextRequest } from 'next/server';
import {
  getHeroCarouselConfigWithTx,
  upsertHeroCarouselConfig,
  defaultHeroCarouselConfig,
  type HeroCarouselConfig,
  heroCarouselConfigSchema,
} from '@entities/tenant/server';
import {
  runWithRLS,
  requireTenantRLS,
  apiSuccess,
  apiInternalError,
  apiValidationError,
  writeAuditLog,
  rateLimitByUser,
  CACHE_TAGS,
} from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { revalidateTag } from 'next/cache';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 8;

const log = createComponentLogger('hero-carousel-api');

export async function GET(request: NextRequest) {
  try {
    const rls = await requireTenantRLS(request);
    if (!rls.ok) return rls.response;
    const { ctx, tenantId } = rls;

    return runWithRLS(ctx, async tx => {
      const config = await getHeroCarouselConfigWithTx(tx, tenantId);
      return apiSuccess(config);
    });
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to get hero carousel config', error);
    return apiInternalError(String(error));
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionRole = await requireAuth(request, { permission: 'admin' });
    if (!sessionRole.success) return sessionRole.response;

    const rateLimit = await rateLimitByUser(sessionRole.data.userId, {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (rateLimit) return rateLimit;

    const rls = await requireTenantRLS(request);
    if (!rls.ok) return rls.response;
    const { ctx, tenantId } = rls;

    const rawBody = await request.json();
    const parsed = heroCarouselConfigSchema.safeParse(rawBody);

    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten());
    }

    const defaults = defaultHeroCarouselConfig();
    const config: HeroCarouselConfig = { ...defaults, ...parsed.data };

    const result = await runWithRLS(ctx, async tx => {
      const oldConfig = await getHeroCarouselConfigWithTx(tx, tenantId);
      const success = await upsertHeroCarouselConfig(tx, tenantId, config);
      return { success, oldConfig };
    });

    if (result.success) {
      writeAuditLog({
        action: 'SETTINGS_CHANGED',
        actorId: sessionRole.data.userId,
        tenantId,
        details: {
          key: 'hero-carousel',
          oldValue: result.oldConfig,
          newValue: config,
          method: 'PUT',
        },
      });
      revalidateTag(CACHE_TAGS.SETTINGS);
      return apiSuccess({ success: true });
    }

    return apiInternalError('Failed to save');
  } catch (error) {
    log.error({ operation: 'PUT' }, 'Failed to update hero carousel config', error);
    return apiInternalError(String(error));
  }
}
