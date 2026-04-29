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
  // Only the actual platform domain (strip port for comparison)
  const hostWithoutPort = host.split(':')[0];
  return hostWithoutPort === PLATFORM_DOMAIN;
}

function isTenantHost(host: string): boolean {
  if (isPlatformHost(host)) return false;

  // Localhost is treated as a tenant for development
  if (host.includes('localhost')) return true;

  // Check if it's a tenant subdomain (e.g., soralia.netbones.co.za)
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

export async function proxy(request: NextRequest) {
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

  // For API routes: still set tenant headers but don't do redirects
  if (isApiRoute) {
    // Edge-safe: infer tenant from hostname only (no DB access in middleware).
    response.headers.set('x-plane', 'tenant');
    response.headers.set('x-tenant-slug', inferredTenantSlug);
    return response;
  }

  // For auth routes: set tenant headers but don't redirect
  if (isAuthRouteCheck) {
    response.headers.set('x-plane', 'tenant');
    response.headers.set('x-tenant-slug', inferredTenantSlug);
    return response;
  }

  // ── 2. Platform host: allow platform routes, deny tenant routes ──
  if (isPlatform) {
    // Redirect root to /home for platform landing (only for platform host, not localhost)
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    if (!isPlatformRoute(pathname) && !pathname.startsWith('/admin/platform')) {
      // Platform host trying to access tenant routes → redirect to platform home
      if (isTenantRoute(pathname)) {
        return NextResponse.redirect(new URL('/admin/platform', request.url));
      }
    }
    // Platform host gets no tenant headers (or could set empty)
    response.headers.set('x-plane', 'platform');
    return response;
  }

  // ── 3. For localhost: treat as tenant with fallback ──
  // Skip platform route checks for localhost - allow all routes
  if (host.includes('localhost')) {
    response.headers.set('x-plane', 'tenant');
    response.headers.set('x-tenant-slug', DEFAULT_TENANT_SLUG);
    return response;
  }

  // ── 4. Tenant host: allow tenant routes, deny platform routes ──
  if (isPlatformRoute(pathname)) {
    // Tenant host trying to access platform routes → redirect to tenant home
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ── 5. Attach inferred tenant headers (edge-safe) ──
  response.headers.set('x-plane', 'tenant');
  response.headers.set('x-tenant-slug', inferredTenantSlug);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

// Log startup for debugging
console.log('[Middleware] Loaded - Platform:', PLATFORM_DOMAIN);
