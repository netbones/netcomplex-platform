import { NextResponse, type NextRequest } from 'next/server';

/**
 * Multi-tenant middleware enforcing host-based routing between platform and tenant planes.
 *
 * Route groups:
 * - (platform) - Platform control plane (app.netbones.co.za)
 * - (tenant) - Tenant data plane (*.netbones.co.za, soralia.org, soralia.com, soralia.co.za, solaris.co.za)
 * - (auth) - Shared auth routes
 *
 * Host rules:
 * - app.netbones.co.za → allow (platform) routes, deny (tenant) routes
 * - *.netbones.co.za, soralia.org, soralia.com, soralia.co.za, solaris.co.za → allow (tenant) routes, deny (platform) routes
 *
 * Key invariant: plane resolution (isPlatform/isLocalhost) MUST occur before any
 * API/auth early-return branches.  Platform API/auth calls must receive x-plane: platform,
 * not x-plane: tenant with slug "app" (which resolves to no tenant, causing downstream
 * failures in withTenant() guards).  See ADVISORY-018 (RC-1, RC-2).
 *
 * Request headers are forwarded via NextResponse.next({ request: { headers } }) so route
 * handlers see middleware-computed values. See ADVISORY-032.
 */

const PLATFORM_DOMAIN = 'app.netbones.co.za';
const DEFAULT_TENANT_SLUG = 'soralia';

const SUPPORTED_LOCALES = ['en', 'af', 'xh', 'zu'] as const;
const DEFAULT_LOCALE = 'en';
const LOCALE_COOKIE = 'i18n-locale';

const MIRROR_REQUEST_HEADERS = [
  'x-request-id',
  'x-pathname',
  'x-locale',
  'x-plane',
  'x-tenant-slug',
] as const;

// CORS configuration for API routes
const CORS_ALLOWED_ORIGINS = [
  'https://app.netbones.co.za',
  'https://soralia.org',
  'https://soralia.com',
  'https://soralia.co.za',
  'https://solaris.co.za',
  process.env.NEXT_PUBLIC_ANDROID_URL || '',
  process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || '',
].filter(Boolean);

function addCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  const requestOrigin = origin || '';
  const isAllowed =
    CORS_ALLOWED_ORIGINS.includes(requestOrigin) ||
    CORS_ALLOWED_ORIGINS.some(allowed => {
      try {
        return new URL(requestOrigin).hostname === new URL(allowed).hostname;
      } catch {
        return false;
      }
    });

  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-plane, x-tenant-slug'
    );
    response.headers.set('Access-Control-Max-Age', '86400');
  }
  return response;
}

/** Forward mutated request headers to downstream route handlers (ADVISORY-032). */
function forwardWithHeaders(
  request: NextRequest,
  apply: (requestHeaders: Headers) => void
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-tenant-slug');
  requestHeaders.delete('x-tenant-id');
  apply(requestHeaders);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const name of MIRROR_REQUEST_HEADERS) {
    const value = requestHeaders.get(name);
    if (value) response.headers.set(name, value);
  }
  return response;
}

function isPlatformHost(host: string): boolean {
  const hostWithoutPort = host.split(':')[0];
  return hostWithoutPort === PLATFORM_DOMAIN;
}

function isTenantRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/directory') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/maintenance') ||
    pathname.startsWith('/providers') ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile') ||
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
    pathname === '/home' ||
    pathname === '/about' ||
    pathname.startsWith('/features') ||
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

/**
 * Detects the user's preferred locale from cookie → accept-language → default.
 */
function detectLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (
    cookieLocale &&
    SUPPORTED_LOCALES.includes(cookieLocale as (typeof SUPPORTED_LOCALES)[number])
  ) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
    if (preferred && SUPPORTED_LOCALES.includes(preferred as (typeof SUPPORTED_LOCALES)[number])) {
      return preferred;
    }
  }

  return DEFAULT_LOCALE;
}

function withLocaleHeaders(res: NextResponse, locale: string, request: NextRequest): NextResponse {
  res.headers.set('x-locale', locale);
  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
  return res;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  const requestId = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);

  const applyBaseHeaders = (requestHeaders: Headers) => {
    requestHeaders.set('x-request-id', requestId);
    requestHeaders.set('x-pathname', pathname);
  };

  const nextWithHeaders = (apply: (requestHeaders: Headers) => void): NextResponse => {
    return forwardWithHeaders(request, requestHeaders => {
      applyBaseHeaders(requestHeaders);
      apply(requestHeaders);
    });
  };

  // ── Static assets: skip all logic ──
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.includes('.')) {
    return nextWithHeaders(() => {});
  }

  // ── Locale detection: cookie → accept-language → 'en' ──
  const locale = detectLocale(request);

  // ── Resolve plane and tenant slug FIRST — before any early returns ──
  const isPlatform = isPlatformHost(host);
  const isLocalhost = host.includes('localhost');

  const hostWithoutPort = host.split(':')[0] || '';
  const subdomain = hostWithoutPort.split('.')[0] || '';
  // Subdomain extraction works for *.netbones.co.za (subdomain = slug).
  // Bare custom domains (soralia.org, solaris.co.za, etc.) are resolved
  // server-side by getTenantByDomain() in resolveTenantFromRequestHeaders().
  const inferredTenantSlug = isLocalhost ? DEFAULT_TENANT_SLUG : subdomain || DEFAULT_TENANT_SLUG;

  const isApiRoute = pathname.startsWith('/api/');
  const isAuthRouteCheck = isAuthRoute(pathname);

  const nextWithLocale = (apply: (requestHeaders: Headers) => void): NextResponse =>
    withLocaleHeaders(
      nextWithHeaders(requestHeaders => {
        requestHeaders.set('x-locale', locale);
        apply(requestHeaders);
      }),
      locale,
      request
    );

  // ── Platform plane: app.netbones.co.za ──
  if (isPlatform) {
    // API and auth routes on the platform domain get platform plane headers.
    // No tenant headers are set — withTenant() guards on platform API routes
    // should use withTenantOptional() or skip tenant context entirely.
    if (isApiRoute || isAuthRouteCheck) {
      if (request.method === 'OPTIONS') {
        const origin = request.headers.get('origin');
        return addCorsHeaders(NextResponse.next(), origin);
      }
      return addCorsHeaders(
        nextWithLocale(requestHeaders => {
          requestHeaders.set('x-plane', 'platform');
        }),
        request.headers.get('origin')
      );
    }

    if (pathname === '/') {
      return withLocaleHeaders(
        NextResponse.redirect(new URL('/home', request.url)),
        locale,
        request
      );
    }

    if (isTenantRoute(pathname)) {
      return withLocaleHeaders(
        NextResponse.redirect(new URL('/home', request.url)),
        locale,
        request
      );
    }

    return nextWithLocale(requestHeaders => {
      requestHeaders.set('x-plane', 'platform');
    });
  }

  // ── Localhost: treat as tenant with default slug ──
  if (isLocalhost) {
    if (isApiRoute || isAuthRouteCheck) {
      if (request.method === 'OPTIONS') {
        const origin = request.headers.get('origin');
        const corsResponse = addCorsHeaders(NextResponse.next(), origin);
        corsResponse.headers.set('x-plane', 'tenant');
        corsResponse.headers.set('x-tenant-slug', DEFAULT_TENANT_SLUG);
        return corsResponse;
      }
      return addCorsHeaders(
        nextWithLocale(requestHeaders => {
          requestHeaders.set('x-plane', 'tenant');
          requestHeaders.set('x-tenant-slug', DEFAULT_TENANT_SLUG);
        }),
        request.headers.get('origin')
      );
    }

    return nextWithLocale(requestHeaders => {
      requestHeaders.set('x-plane', 'tenant');
      requestHeaders.set('x-tenant-slug', DEFAULT_TENANT_SLUG);
    });
  }

  // ── Tenant plane: *.netbones.co.za / custom domains ──
  if (isApiRoute || isAuthRouteCheck) {
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('origin');
      const corsResponse = addCorsHeaders(NextResponse.next(), origin);
      corsResponse.headers.set('x-plane', 'tenant');
      corsResponse.headers.set('x-tenant-slug', inferredTenantSlug);
      return corsResponse;
    }
    return addCorsHeaders(
      nextWithLocale(requestHeaders => {
        requestHeaders.set('x-plane', 'tenant');
        requestHeaders.set('x-tenant-slug', inferredTenantSlug);
      }),
      request.headers.get('origin')
    );
  }

  if (isPlatformRoute(pathname)) {
    return withLocaleHeaders(NextResponse.redirect(new URL('/', request.url)), locale, request);
  }

  return nextWithLocale(requestHeaders => {
    requestHeaders.set('x-plane', 'tenant');
    requestHeaders.set('x-tenant-slug', inferredTenantSlug);
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
