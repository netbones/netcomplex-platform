// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getTenantByDomain, getTenantBySlug } from '@/lib/tenant';

const PLATFORM_DOMAIN = 'app.netbones.co.za';
const DEFAULT_TENANT_SLUG = 'soralia';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // ── 1. Skip middleware for static assets, API routes, and platform admin ──
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') || // files with extensions
    pathname.startsWith('/admin/platform') || // NetComplex super-admin
    pathname.startsWith('/platform') // future platform routes
  ) {
    return response;
  }

  // ── 2. Tenant Resolution ──
  let tenant = null;

  if (host.includes(PLATFORM_DOMAIN)) {
    // Subdomain handling: soralia.netcomplex.netbones.co.za
    const subdomain = host.replace(`.${PLATFORM_DOMAIN}`, '').replace('www.', '');
    if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
      tenant = await getTenantBySlug(subdomain);
    }
  } else {
    // Custom domain (e.g. soraliavillage.co.za)
    tenant = await getTenantByDomain(host);
  }

  // Fallback: Always default to Soralia Village (important for localhost + main domain)
  if (!tenant) {
    tenant = await getTenantBySlug(DEFAULT_TENANT_SLUG);
  }

  // ── 3. Attach tenant information to headers ──
  if (tenant) {
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
  runtime: 'nodejs',
};
