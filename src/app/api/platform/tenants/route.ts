import { NextRequest } from 'next/server';
import { TIERS, type TierLevel } from '@entities/tenant';
import {
  db,
  users,
  tenants,
  apiConflict,
  apiError,
  apiInternalError,
  apiSuccess,
} from '@api/server';

import { eq } from 'drizzle-orm';
import { logError } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

interface SignupRequest {
  name: string;
  slug: string;
  plan: TierLevel;
  admin: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
  };
}

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const body: SignupRequest = await request.json();

    // Validate the plan is a valid tier
    if (!['core', 'foundation', 'pro-max'].includes(body.plan)) {
      return apiError('VALIDATION_ERROR', 'Invalid subscription plan', 400);
    }

    // Check if subdomain is already taken
    const existingTenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, body.slug))
      .limit(1);

    if (existingTenant.length > 0) {
      return apiConflict('Subdomain is already taken');
    }

    // Check if email is already taken
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, body.admin.email))
      .limit(1);

    if (existingUser.length > 0) {
      return apiConflict('Email address is already registered');
    }

    // Get tier configuration
    const tierConfig = TIERS[body.plan];

    // Step 1: Create admin user via Better Auth (handles password hashing)
    // We do this first because Better Auth handles its own internal transaction
    const authResponse = await fetch(`${BETTER_AUTH_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: BETTER_AUTH_URL,
      },
      body: JSON.stringify({
        email: body.admin.email,
        password: body.admin.password,
        name: `${body.admin.firstName} ${body.admin.lastName}`,
      }),
    });

    if (!authResponse.ok) {
      const authError = await authResponse.json();
      if (authResponse.status === 422) {
        return apiConflict('Email address is already registered');
      }
      const errMsg =
        authError.message ||
        authError.body?.message ||
        authError.error?.message ||
        String(authError.error || 'Failed to create user account');
      return apiError('VALIDATION_ERROR', errMsg, authResponse.status);
    }

    const authData = await authResponse.json();
    const userId = authData.user?.id;

    if (!userId) {
      return apiInternalError('Failed to retrieve user id from auth response');
    }

    let tenantId: string | undefined;

    try {
      // Step 2: Atomic transaction for tenant creation and role assignment
      await db.transaction(async tx => {
        // Create the tenant (UUID generated automatically)
        const [newTenant] = await tx
          .insert(tenants)
          .values({
            id: createId(),
            name: body.name,
            slug: body.slug,
            customDomain: null,
            logoUrl: null,
            faviconUrl: null,
            primaryColor: '#4F46E5',
            accentColor: null,
            secondaryColor: null,
            fontFamily: null,
            customCss: null,
            active: true,
            subscriptionTier: body.plan,
            tier: 'STANDARD',
            maxPages: tierConfig.maxPages,
            pageCount: 0,
            featureFlags: {},
            ownerId: userId,
          })
          .returning();

        tenantId = newTenant.id;

        // Update the user to link to the tenant and set ADMIN role
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
      // If the transaction fails, we must clean up the user created in Step 1
      // to avoid leaving a stranded user without a tenant.
      await db.delete(users).where(eq(users.id, userId));
      throw err;
    }

    return apiSuccess(
      {
        tenantId: tenantId,
        tenant: {
          id: tenantId,
          name: body.name,
          slug: body.slug,
          subscriptionTier: body.plan,
        },
        user: {
          id: userId,
          email: body.admin.email,
          name: `${body.admin.firstName} ${body.admin.lastName}`,
          role: 'ADMIN',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logError(
      { component: 'platform-tenants-api', operation: 'CREATE' },
      'Failed to create tenant and user',
      error
    );
    return apiInternalError('Failed to create community. Please try again.');
  }
}
