import { NextRequest } from 'next/server';
import { TIERS, type TierLevel } from '@entities/tenant';
import {
  auth,
  db,
  users,
  tenants,
  apiConflict,
  apiCreated,
  apiError,
  apiForbidden,
  apiInternalError,
  apiUnauthorized,
  apiValidationError,
  withErrorHandler,
} from '@api/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { logError } from '@shared/lib';
import { createId } from '@shared/lib/id';
import { initTenantSetup } from '@entities/setup/server';

export const maxDuration = 8;

// ── Request shape: tenant-only (user already exists in session) ──
interface CommunitySetupRequest {
  name: string;
  slug: string;
  plan: TierLevel;
}

// ── Zod schema for request validation ──
const communitySetupSchema = z.object({
  name: z.string().min(1, 'Community name is required').max(100).trim(),
  slug: z
    .string()
    .min(1, 'Subdomain is required')
    .min(3, 'Subdomain must be at least 3 characters')
    .max(50)
    .regex(
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
      'Subdomain must use lowercase letters, numbers, and hyphens'
    ),
  plan: z.enum(['core', 'foundation', 'pro-max'], {
    errorMap: () => ({ message: 'Invalid subscription plan' }),
  }),
});

/**
 * POST /api/platform/tenants
 *
 * Authenticated tenant provisioning. Creates a new tenant and links
 * the authenticated user as its ADMIN. The user MUST already exist
 * (verified session required). No user creation happens here.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // 1. Authenticate — require valid session
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return apiUnauthorized('Authentication required');
  }

  // 2. Require verified email — prevents zombie tenants from throwaway emails
  if (!session.user.emailVerified) {
    return apiForbidden('Email must be verified before creating a community');
  }

  const userId = session.user.id;

  // 3. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body', 400);
  }

  const parsed = communitySetupSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const { name, slug, plan } = parsed.data;

  // 4. Slug uniqueness check
  const existingTenant = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);

  if (existingTenant.length > 0) {
    return apiConflict('Subdomain is already taken');
  }

  // 5. Get tier configuration
  const tierConfig = TIERS[plan];

  // 6. Atomic transaction: create tenant + link user as ADMIN
  let tenantId = '';
  try {
    await db.transaction(async tx => {
      const [newTenant] = await tx
        .insert(tenants)
        .values({
          id: createId(),
          name,
          slug,
          customDomain: null,
          logoUrl: null,
          faviconUrl: null,
          primaryColor: '#4F46E5',
          accentColor: null,
          secondaryColor: null,
          fontFamily: null,
          customCss: null,
          active: true,
          subscriptionTier: plan,
          tier: 'STANDARD',
          maxPages: tierConfig.maxPages,
          pageCount: 0,
          featureFlags: {},
          ownerId: userId,
        })
        .returning();

      tenantId = newTenant.id;

      // Link user to the new tenant as ADMIN
      await tx
        .update(users)
        .set({
          tenantId: newTenant.id,
          role: 'ADMIN',
          isPlatformAdmin: false,
        })
        .where(eq(users.id, userId));
    });
  } catch (err) {
    logError(
      { component: 'platform-tenants-api', operation: 'CREATE_TENANT_TX' },
      'Failed to create tenant',
      err
    );
    return apiInternalError('Failed to create community. Please try again.');
  }

  // 7. Initialize Setup Center data (fire-and-forget)
  try {
    await initTenantSetup(tenantId, plan);
  } catch (setupErr) {
    logError(
      { component: 'platform-tenants-api', operation: 'INIT_SETUP' },
      'Failed to initialize Setup Center for tenant',
      setupErr
    );
    // Explicitly do NOT throw — do not block tenant creation
  }

  return apiCreated({
    tenantId: tenantId,
    tenant: {
      id: tenantId,
      name,
      slug,
      subscriptionTier: plan,
    },
  });
});
