import { z } from 'zod';
import {
  router,
  publicProcedure,
  tenantProcedure,
  db,
  settings,
  tenants,
  tenantModules,
  platformModules,
  users,
  toEnvelope,
} from '@api/server';
import { TRPCError } from '@trpc/server';
import { eq, desc } from 'drizzle-orm';
import { createId } from '@shared/lib/id';
import { TIERS, type TierLevel } from '@entities/tenant';
import type { TenantTier } from '@shared/lib';

const TIER_ORDER: Record<TenantTier, number> = {
  STANDARD: 1,
  PREMIUM: 2,
  ENTERPRISE: 3,
};

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

const OnboardingInput = z.object({
  tenantId: z.string().min(1),
  step: z.number().int().min(1).max(5),
  data: z.record(z.unknown()),
});

const CreateTenantInput = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  plan: z.enum(['core', 'foundation', 'pro-max']),
  admin: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(8),
  }),
});

const TenantModulesInput = z.object({ tenantId: z.string() });

const VALID_PLANS = new Set<TierLevel>(['core', 'foundation', 'pro-max']);

function castPlan(plan: string): TierLevel {
  if (VALID_PLANS.has(plan as TierLevel)) return plan as TierLevel;
  return 'core';
}

export const platformRouter = router({
  saveOnboardingStep: publicProcedure
    .input(OnboardingInput)
    .meta({
      openapi: {
        method: 'POST',
        path: '/platform/onboarding',
        protect: false,
        tags: ['platform'],
      },
    })
    .mutation(async ({ input }) => {
      const tenantRows = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .limit(1);

      if (tenantRows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant not found' });
      }

      const settingKey = `onboarding_step_${input.step}`;

      await db.transaction(async tx => {
        const rows = await tx.select().from(settings).where(eq(settings.tenantId, input.tenantId));

        const existing = rows.find(s => s.key === settingKey);

        if (existing) {
          await tx
            .update(settings)
            .set({ value: JSON.stringify(input.data) })
            .where(eq(settings.id, existing.id));
        } else {
          await tx.insert(settings).values({
            id: createId(),
            tenantId: input.tenantId,
            key: settingKey,
            value: JSON.stringify(input.data),
          });
        }

        if (input.step === 5) {
          const completedKey = 'onboarding_completed';
          const completedRows = await tx
            .select()
            .from(settings)
            .where(eq(settings.tenantId, input.tenantId));

          const completedExisting = completedRows.find(s => s.key === completedKey);

          if (completedExisting) {
            await tx
              .update(settings)
              .set({ value: 'true' })
              .where(eq(settings.id, completedExisting.id));
          } else {
            await tx.insert(settings).values({
              id: createId(),
              tenantId: input.tenantId,
              key: completedKey,
              value: 'true',
            });
          }
        }
      });

      return toEnvelope({ success: true, step: input.step });
    }),

  createTenant: publicProcedure
    .input(CreateTenantInput)
    .meta({
      openapi: {
        method: 'POST',
        path: '/platform/tenants',
        protect: false,
        tags: ['platform'],
      },
    })
    .mutation(async ({ input }) => {
      const existingTenantRows = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.slug, input.slug))
        .limit(1);

      if (existingTenantRows.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Subdomain is already taken' });
      }

      const existingUserRows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.admin.email))
        .limit(1);

      if (existingUserRows.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Email address is already registered' });
      }

      const tierConfig = TIERS[castPlan(input.plan)];

      const authResponse = await fetch(`${BETTER_AUTH_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: BETTER_AUTH_URL,
        },
        body: JSON.stringify({
          email: input.admin.email,
          password: input.admin.password,
          name: `${input.admin.firstName} ${input.admin.lastName}`,
        }),
      });

      if (!authResponse.ok) {
        const authError = await authResponse.json();
        if (authResponse.status === 422) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Email address is already registered' });
        }
        const errMsg =
          authError.message ||
          authError.body?.message ||
          authError.error?.message ||
          String(authError.error || 'Failed to create user account');
        throw new TRPCError({ code: 'BAD_REQUEST', message: errMsg });
      }

      const authData = await authResponse.json();
      const userId = authData.user?.id;

      if (!userId) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve user id from auth response',
        });
      }

      let tenantId: string | undefined;

      try {
        await db.transaction(async tx => {
          const [newTenant] = await tx
            .insert(tenants)
            .values({
              id: createId(),
              name: input.name,
              slug: input.slug,
              customDomain: null,
              logoUrl: null,
              faviconUrl: null,
              primaryColor: '#4F46E5',
              accentColor: null,
              secondaryColor: null,
              fontFamily: null,
              customCss: null,
              active: true,
              subscriptionTier: castPlan(input.plan),
              tier: 'STANDARD',
              maxPages: tierConfig.maxPages,
              pageCount: 0,
              featureFlags: {},
              ownerId: userId,
            })
            .returning();

          tenantId = newTenant.id;

          await tx
            .update(users)
            .set({
              tenantId: newTenant.id,
              role: 'ADMIN',
              isPlatformAdmin: false,
            })
            .where(eq(users.id, userId));
        });
      } catch (_err: unknown) {
        await db.delete(users).where(eq(users.id, userId));
        throw _err;
      }

      return toEnvelope({
        tenantId,
        tenant: {
          id: tenantId,
          name: input.name,
          slug: input.slug,
          subscriptionTier: input.plan,
        },
        user: {
          id: userId,
          email: input.admin.email,
          name: `${input.admin.firstName} ${input.admin.lastName}`,
          role: 'ADMIN',
        },
      });
    }),

  listTenantModules: tenantProcedure
    .input(TenantModulesInput)
    .meta({
      openapi: {
        method: 'GET',
        path: '/platform/tenants/modules',
        protect: true,
        tags: ['platform'],
      },
    })
    .query(async ({ input }) => {
      const [tenantRow] = await db
        .select({ tier: tenants.tier })
        .from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .limit(1);

      if (!tenantRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant not found' });
      }

      const tenantTierLevel = TIER_ORDER[tenantRow.tier] ?? 0;

      const allModules = await db
        .select()
        .from(platformModules)
        .orderBy(desc(platformModules.minTier));

      const tenantModuleRows = await db
        .select()
        .from(tenantModules)
        .where(eq(tenantModules.tenantId, input.tenantId));

      const tenantModuleMap = new Map(tenantModuleRows.map(m => [m.moduleKey, m]));

      const enabled: Record<string, { enabled: boolean; config?: unknown; enabledAt?: string }> =
        {};

      for (const mod of allModules) {
        const moduleTierLevel = TIER_ORDER[mod.minTier] ?? 0;

        if (tenantTierLevel < moduleTierLevel) {
          continue;
        }

        const tenantMod = tenantModuleMap.get(mod.key);
        const isEnabled = tenantMod?.enabled ?? mod.defaultEnabled;

        enabled[mod.key] = {
          enabled: isEnabled,
          config: tenantMod?.config ?? undefined,
          enabledAt: tenantMod?.enabledAt?.toISOString() ?? undefined,
        };
      }

      return toEnvelope(enabled);
    }),
});
