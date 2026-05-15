import { NextRequest, NextResponse } from 'next/server';
import { TIERS, type TierLevel } from '@entities/tenant/api/features/registry';
import { createTenant, getTenantById } from '@entities/tenant/api/base';
import { db, users, tenants } from '@api/db';
import { eq } from 'drizzle-orm';
import { logError } from '@shared/lib';

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
    if (!['foundation', 'depth', 'core'].includes(body.plan)) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 });
    }

    // Check if subdomain is already taken
    const existingTenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, body.slug))
      .limit(1);

    if (existingTenant.length > 0) {
      return NextResponse.json({ error: 'Subdomain is already taken' }, { status: 409 });
    }

    // Check if email is already taken
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, body.admin.email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'Email address is already registered' }, { status: 409 });
    }

    // Get tier configuration
    const tierConfig = TIERS[body.plan];

    // Step 1: Create tenant with ownerId=null (we don't have user id yet)
    const tenant = await createTenant({
      id: crypto.randomUUID(),
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
    });

    // Step 2: Create admin user via Better Auth (handles password hashing)
    const authResponse = await fetch(`${BETTER_AUTH_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: body.admin.email,
        password: body.admin.password,
        name: `${body.admin.firstName} ${body.admin.lastName}`,
      }),
    });

    if (!authResponse.ok) {
      // Better Auth signup failed — clean up the tenant we just created
      await db.delete(tenants).where(eq(tenants.id, tenant.id));
      const authError = await authResponse.json();
      if (authResponse.status === 422) {
        return NextResponse.json({ error: 'Email address is already registered' }, { status: 409 });
      }
      return NextResponse.json(
        { error: authError.error || 'Failed to create user account' },
        { status: authResponse.status }
      );
    }

    const authData = await authResponse.json();
    const userId = authData.user?.id;

    if (!userId) {
      await db.delete(tenants).where(eq(tenants.id, tenant.id));
      return NextResponse.json(
        { error: 'Failed to retrieve user id from auth response' },
        { status: 500 }
      );
    }

    // Step 3: Atomic update — set user's tenantId and tenant's ownerId
    await db.transaction(async tx => {
      await tx
        .update(users)
        .set({
          tenantId: tenant.id,
          role: 'ADMIN',
          isPlatformAdmin: false,
        })
        .where(eq(users.id, userId));

      await tx.update(tenants).set({ ownerId: userId }).where(eq(tenants.id, tenant.id));
    });

    // Fetch the fully-linked tenant for response
    const linkedTenant = await getTenantById(tenant.id);

    return NextResponse.json(
      {
        tenantId: tenant.id,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          subscriptionTier: tenant.subscriptionTier,
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
    return NextResponse.json(
      { error: 'Failed to create community. Please try again.' },
      { status: 500 }
    );
  }
}
