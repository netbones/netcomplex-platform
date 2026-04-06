// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getTenantByDomain, getTenantBySlug } from '@/lib/tenant';

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
  return host === PLATFORM_DOMAIN || host.includes('localhost');
}

function isTenantHost(host: string): boolean {
  if (isPlatformHost(host)) return false;

  // Check if it's a tenant subdomain (e.g., soralia.netbones.co.za)
  for (const domain of TENANT_DOMAINS) {
    if (host.endsWith(`.${domain}`) || host === domain) {
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

  // ── 1. Skip middleware for static assets, API routes, auth routes ──
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') || // files with extensions
    isAuthRoute(pathname)
  ) {
    return response;
  }

  // ── 2. Platform host: allow platform routes, deny tenant routes ──
  if (isPlatform) {
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

  // ── 3. Tenant host: allow tenant routes, deny platform routes ──
  if (isPlatformRoute(pathname)) {
    // Tenant host trying to access platform routes → redirect to tenant home
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ── 4. Tenant Resolution (for tenant hosts) ──
  let tenant = null;

  if (isTenantHost(host)) {
    // Subdomain handling: soralia.netbones.co.za
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'platform') {
      tenant = await getTenantBySlug(subdomain);
    }

    // Fall back to custom domain lookup if no subdomain match
    if (!tenant) {
      tenant = await getTenantByDomain(host);
    }
  } else {
    // Custom domain (e.g. soralia.org, soralia.com, soralia.co.za)
    tenant = await getTenantByDomain(host);
  }

  // Fallback: Always default to Soralia Village (important for localhost + main domain)
  if (!tenant) {
    tenant = await getTenantBySlug(DEFAULT_TENANT_SLUG);
  }

  // ── 5. Attach tenant information to headers ──
  if (tenant) {
    response.headers.set('x-plane', 'tenant');
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-slug', tenant.slug);
    response.headers.set('x-tenant-name', tenant.name);
    response.headers.set('x-primary-color', tenant.primaryColor || '#4F46E5');
    response.headers.set('x-accent-color', tenant.accentColor || '');
    response.headers.set('x-secondary-color', tenant.secondaryColor || '');
    response.headers.set('x-logo-url', tenant.logoUrl || '');
    response.headers.set('x-favicon-url', tenant.faviconUrl || '');
    response.headers.set('x-font-family', tenant.fontFamily || '');
    response.headers.set('x-feature-flags', JSON.stringify(tenant.featureFlags || {}));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
