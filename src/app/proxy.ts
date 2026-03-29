import { auth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function proxy(request: Request): Promise<NextResponse> {
  const { pathname } = new URL(request.url);

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const userRole = session?.user?.id
    ? (
        await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { role: true },
        })
      )?.role || 'RESIDENT'
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

  const protectedPaths: Array<{ path: string; permission: keyof Permission }> = [
    { path: '/dashboard', permission: 'directory' },
    { path: '/admin', permission: 'users' },
    { path: '/admin/surveys', permission: 'content' },
    { path: '/admin/categories', permission: 'settings' },
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
