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
 *
 * Key invariant: plane resolution (isPlatform/isLocalhost) MUST occur before any
 * API/auth early-return branches.  Platform API/auth calls must receive x-plane: platform,
 * not x-plane: tenant with slug "app" (which resolves to no tenant, causing downstream
 * failures in withTenant() guards).  See ADVISORY-018 (RC-1, RC-2).
 */

const PLATFORM_DOMAIN = 'app.netbones.co.za';
const DEFAULT_TENANT_SLUG = 'soralia';

function isPlatformHost(host: string): boolean {
  const hostWithoutPort = host.split(':')[0];
  return hostWithoutPort === PLATFORM_DOMAIN;
}

function isTenantRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/directory') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/maintenance') ||
    pathname.startsWith('/providers') ||
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

/**
 * Canonical API Route Classification (API.md §4-5):
 *
 * /api/v1/public/*   → No auth required
 * /api/v1/tenant/*   → Authenticated tenant member
 * /api/v1/platform/* → Platform administrator only
 * /api/v1/system/*   → Infrastructure/internal
 * /api/webhooks/*    → Signed webhook payloads
 *
 * Flat /api/* routes are legacy — new routes should use v1 structure.
 * See docs/STEERING/API.md §5 and docs/architecture/API_ARCHITECTURE.md §10
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const requestId = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
  response.headers.set('x-request-id', requestId);
  request.headers.set('x-request-id', requestId);

  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  response.headers.set('x-pathname', pathname);
  request.headers.set('x-pathname', pathname);

  // ── Static assets: skip all logic ──
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.includes('.')) {
    return response;
  }

  // ── Resolve plane and tenant slug FIRST — before any early returns ──
  const isPlatform = isPlatformHost(host);
  const isLocalhost = host.includes('localhost');

  const hostWithoutPort = host.split(':')[0] || '';
  const subdomain = hostWithoutPort.split('.')[0] || '';
  const inferredTenantSlug = isLocalhost ? DEFAULT_TENANT_SLUG : subdomain || DEFAULT_TENANT_SLUG;

  const isApiRoute = pathname.startsWith('/api/');
  const isAuthRouteCheck = isAuthRoute(pathname);

  // ── Platform plane: app.netbones.co.za ──
  if (isPlatform) {
    // API and auth routes on the platform domain get platform plane headers.
    // No tenant headers are set — withTenant() guards on platform API routes
    // should use withTenantOptional() or skip tenant context entirely.
    if (isApiRoute || isAuthRouteCheck) {
      response.headers.set('x-plane', 'platform');
      return response;
    }

    // Redirect root to platform home
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/home', request.url));
    }

    // Redirect tenant routes to platform home
    if (isTenantRoute(pathname)) {
      return NextResponse.redirect(new URL('/home', request.url));
    }

    response.headers.set('x-plane', 'platform');
    return response;
  }

  // ── Localhost: treat as tenant with default slug ──
  if (isLocalhost) {
    if (isApiRoute || isAuthRouteCheck) {
      response.headers.set('x-plane', 'tenant');
      response.headers.set('x-tenant-slug', DEFAULT_TENANT_SLUG);
      return response;
    }
    response.headers.set('x-plane', 'tenant');
    response.headers.set('x-tenant-slug', DEFAULT_TENANT_SLUG);
    return response;
  }

  // ── Tenant plane: *.netbones.co.za / custom domains ──
  if (isApiRoute || isAuthRouteCheck) {
    response.headers.set('x-plane', 'tenant');
    response.headers.set('x-tenant-slug', inferredTenantSlug);
    return response;
  }

  // Block platform routes on tenant domains
  if (isPlatformRoute(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  response.headers.set('x-plane', 'tenant');
  response.headers.set('x-tenant-slug', inferredTenantSlug);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
