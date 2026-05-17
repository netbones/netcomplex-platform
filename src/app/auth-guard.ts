import { auth } from '@api/auth';
import { hasPermission, Permission } from '@entities/tenant/api/permissions';
import { db, users, assistSessions } from '@api/db';
import { NextResponse } from 'next/server';
import { eq, and, gt } from 'drizzle-orm';

export async function proxy(request: Request): Promise<NextResponse> {
  const { pathname } = new URL(request.url);

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const userRole = session?.user?.id
    ? (await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)))[0]
        ?.role || 'RESIDENT'
    : 'RESIDENT';

  const publicPaths = [
    '/',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/api/auth',
    '/conservation',
    '/terms',
    '/privacy',
    '/guidelines',
    '/competition',
    '/proudly-soralia',
    '/platform/signup',
    '/platform/onboarding',
  ];

  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // Platform Admin routes require isPlatformAdmin flag
  if (pathname.startsWith('/platform/admin') || pathname.startsWith('/api/admin/platform')) {
    const user = await db
      .select({ isPlatformAdmin: users.isPlatformAdmin })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user[0]?.isPlatformAdmin) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden - Platform Admin access required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/', request.url));
    }

    // AssistSession scope enforcement for platform admin accessing tenant-scoped routes
    if (pathname.startsWith('/api/admin/platform/tenants/')) {
      const pathParts = pathname.split('/');
      const tenantsIdx = pathParts.indexOf('tenants');
      const tenantId = tenantsIdx >= 0 ? pathParts[tenantsIdx + 1] : null;

      if (tenantId && tenantId !== 'route' && tenantId !== 'assist') {
        const now = new Date();
        const activeSession = await db
          .select()
          .from(assistSessions)
          .where(
            and(
              eq(assistSessions.tenantId, tenantId),
              eq(assistSessions.staffId, session.user.id),
              eq(assistSessions.isActive, true),
              gt(assistSessions.expiresAt, now)
            )
          )
          .limit(1);

        if (activeSession.length > 0) {
          const assistSession = activeSession[0];
          // Enforce scope restriction
          if (assistSession.scope === 'metadata') {
            // Metadata scope is read-only for tenant metadata fields
            // Block all mutations and access to sensitive sub-resources
            const isRestrictedPath =
              pathname.includes('/users') ||
              pathname.includes('/content') ||
              pathname.includes('/settings');

            if (request.method !== 'GET' || isRestrictedPath) {
              return NextResponse.json(
                {
                  error:
                    'Assist session is metadata-read-only. Access to users, content, and settings is restricted.',
                },
                { status: 403 }
              );
            }
          }
        }
      }
    }
  }

  const protectedPaths: Array<{ path: string; permission: keyof Permission }> = [
    { path: '/dashboard', permission: 'directory' },
    { path: '/admin', permission: 'users' },
    { path: '/admin/surveys', permission: 'content' },
    { path: '/admin/categories', permission: 'settings' },
    { path: '/admin/external-surveys', permission: 'content' },
    { path: '/maintenance', permission: 'requests' },
    { path: '/bookings', permission: 'bookings' },
    { path: '/events', permission: 'events' },
    { path: '/groups', permission: 'groups' },
    { path: '/interest', permission: 'groupsOwn' },
    { path: '/directory', permission: 'directory' },
    { path: '/services', permission: 'bookings' },
    { path: '/resources', permission: 'content' },
    { path: '/messages', permission: 'messages' },
    { path: '/notifications', permission: 'messages' },
    { path: '/settings', permission: 'settings' },
  ];

  const groupsPermissionCheck = (role: string) =>
    hasPermission(role, 'groups') || hasPermission(role, 'groupsOwn');

  const authOnlyPaths = ['/groups', '/interest'];

  const isAuthOnlyPath =
    authOnlyPaths.some(p => pathname.startsWith(p)) &&
    !protectedPaths.some(p => pathname.startsWith(p.path));

  if (isAuthOnlyPath) {
    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    return NextResponse.next();
  }

  for (const { path, permission } of protectedPaths) {
    const hasAccess =
      path === '/groups' ? groupsPermissionCheck(userRole) : hasPermission(userRole, permission);

    if (pathname.startsWith(path) && !hasAccess) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
