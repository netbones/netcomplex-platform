import { NextRequest, NextResponse } from 'next/server';
import { TIERS, type TierLevel } from '@api/features/registry';
import { createTenant } from '@api/tenant/server';
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

    // Create tenant
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
      maxPages: tierConfig.maxPages,
      pageCount: 0,
      featureFlags: {},
    });

    // Create admin user
    const [user] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        tenantId: tenant.id,
        email: body.admin.email,
        name: `${body.admin.firstName} ${body.admin.lastName}`,
        role: 'ADMIN',
        isActive: true,
        phone: body.admin.phone || null,
        interests: [],
        avatar: null,
        profileImage: null,
        books: [],
        dashboardLayout: null,
        isPublic: true,
        showEmail: true,
        showPhone: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: false,
        image: null,
        twoFactorEnabled: false,
      })
      .returning();

    // Note: Password will be set when the user completes Better Auth signup
    // For now, we just create the user record with tenant association

    return NextResponse.json(
      {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          subscriptionTier: tenant.subscriptionTier,
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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
