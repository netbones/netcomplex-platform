// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Multi-tenant middleware enforcing host-based routing between platform and tenant planes.
 *
 * Route groups:
 * - (platform) - Platform control plane (app.netbones.co.za)
 * - (tenant) - Tenant data plane (*.netbones.co.za, soralia.org, soralia.com, soralia.co.za)
 * - (auth) - Shared auth routes
 *
 * Host rules:
 * - app.netbones.co.za → allow (platform) routes, deny (tenant) routes
 * - *.netbones.co.za, soralia.org, soralia.com, soralia.co.za → allow (tenant) routes, deny (platform) routes
 */

const PLATFORM_DOMAIN = 'app.netbones.co.za';
const DEFAULT_TENANT_SLUG = 'soralia';

const TENANT_DOMAINS = ['netbones.co.za', 'soralia.org', 'soralia.com', 'soralia.co.za'];

function isPlatformHost(host: string): boolean {
  const hostWithoutPort = host.split(':')[0];
  return hostWithoutPort === PLATFORM_DOMAIN;
}

function isTenantHost(host: string): boolean {
  if (isPlatformHost(host)) return false;
  if (host.includes('localhost')) return true;
  const hostWithoutPort = host.split(':')[0];
  for (const domain of TENANT_DOMAINS) {
    if (hostWithoutPort.endsWith(`.${domain}`) || hostWithoutPort === domain) {
      return true;
    }
  }
  return false;
}

function isTenantRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/directory') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/maintenance') ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/residents') ||
    pathname.startsWith('/member') ||
    pathname.startsWith('/unit') ||
    pathname.startsWith('/news') ||
    pathname.startsWith('/services') ||
    pathname.startsWith('/resources') ||
    pathname.startsWith('/interest') ||
    pathname.startsWith('/conservation') ||
    pathname.startsWith('/competition') ||
    pathname.startsWith('/guidelines') ||
    pathname.startsWith('/proudly-soralia') ||
    pathname.startsWith('/admin/')
  );
}

function isPlatformRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/home' ||
    pathname.startsWith('/admin/platform') ||
    pathname.startsWith('/platform') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup')
  );
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/api/auth')
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  const isPlatform = isPlatformHost(host);

  const isApiRoute = pathname.startsWith('/api/');
  const isAuthRouteCheck = isAuthRoute(pathname);

  // ── 1. Skip redirect logic for static assets, API routes, auth routes, but still set tenant headers ──
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.includes('.')) {
    return response;
  }

  const hostWithoutPort = host.split(':')[0] || '';
  const subdomain = hostWithoutPort.split('.')[0] || '';
  const inferredTenantSlug = hostWithoutPort.includes('localhost')
    ? DEFAULT_TENANT_SLUG
    : subdomain || DEFAULT_TENANT_SLUG;

  // ── 2. For API routes: still set tenant headers but don't do redirects ──
  if (isApiRoute) {
    response.headers.set('x-plane', 'tenant');
    response.headers.set('x-tenant-slug', inferredTenantSlug);
    return response;
  }

  // ── 3. For auth routes: set tenant headers but don't redirect ──
  if (isAuthRouteCheck) {
    response.headers.set('x-plane', 'tenant');
    response.headers.set('x-tenant-slug', inferredTenantSlug);
    return response;
  }

  // ── 4. Platform host: allow platform routes, deny tenant routes ──
  if (isPlatform) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    if (!isPlatformRoute(pathname) && !pathname.startsWith('/admin/platform')) {
      if (isTenantRoute(pathname)) {
        return NextResponse.redirect(new URL('/admin/platform', request.url));
      }
    }
    response.headers.set('x-plane', 'platform');
    return response;
  }

  // ── 5. For localhost: treat as tenant with fallback ──
  if (host.includes('localhost')) {
    response.headers.set('x-plane', 'tenant');
    response.headers.set('x-tenant-slug', DEFAULT_TENANT_SLUG);
    return response;
  }

  // ── 6. Tenant host: allow tenant routes, deny platform routes ──
  if (isPlatformRoute(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ── 7. Attach inferred tenant headers (edge-safe) ──
  response.headers.set('x-plane', 'tenant');
  response.headers.set('x-tenant-slug', inferredTenantSlug);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

console.log('[Middleware] Loaded - Platform:', PLATFORM_DOMAIN);
