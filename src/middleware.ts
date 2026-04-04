import { NextResponse, type NextRequest } from 'next/server';
import { getTenantByDomain, getTenantBySlug } from '@/lib/tenant';

const PLATFORM_DOMAIN = 'netcomplex.netbones.co.za';
const DEFAULT_TENANT_SLUG = 'soralia';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes, static files, and platform admin
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/admin/platform')
  ) {
    return response;
  }

  // Extract subdomain or custom domain
  let tenantSlug: string | null = null;
  let customDomain: string | null = null;

  if (host.includes(PLATFORM_DOMAIN)) {
    // Subdomain pattern: soralia.netcomplex.netbones.co.za
    const subdomain = host.replace(`.${PLATFORM_DOMAIN}`, '');
    if (subdomain !== host && subdomain !== 'www') {
      tenantSlug = subdomain;
    }
  } else {
    // Custom domain - use as-is
    customDomain = host;
  }

  // Resolve tenant
  let tenant = null;

  if (customDomain) {
    tenant = await getTenantByDomain(customDomain);
  } else if (tenantSlug) {
    tenant = await getTenantBySlug(tenantSlug);
  } else {
    // Default tenant for platform domain
    tenant = await getTenantBySlug(DEFAULT_TENANT_SLUG);
  }

  if (tenant) {
    // Set tenant headers for downstream use
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-slug', tenant.slug);
    response.headers.set('x-tenant-name', tenant.name);
    response.headers.set('x-primary-color', tenant.primaryColor);
    response.headers.set('x-accent-color', tenant.accentColor || '');
    response.headers.set('x-secondary-color', tenant.secondaryColor || '');
    response.headers.set('x-logo-url', tenant.logoUrl || '');
    response.headers.set('x-favicon-url', tenant.faviconUrl || '');
    response.headers.set('x-font-family', tenant.fontFamily || '');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
