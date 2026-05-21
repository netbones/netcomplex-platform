import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug } from '@/entities/tenant/api/base';

const PLATFORM_HOSTS = ['localhost:3000', 'netcomplex.vercel.app', 'app.netbones.co.za'];
const RESERVED_SUBDOMAINS = ['app', 'www', 'admin', 'api', 'docs', 'mail'];

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const normalizedHostname = hostname.replace(/^www\./, '');

  // 1. Platform Host Detection
  if (PLATFORM_HOSTS.includes(normalizedHostname)) {
    return NextResponse.next();
  }

  // 2. Extract Subdomain
  const subdomain = normalizedHostname.split('.')[0];

  // 3. Reserved Subdomain Protection
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return NextResponse.rewrite(new URL('/404', request.url));
  }

  // 4. Tenant Lookup
  const tenant = await getTenantBySlug(subdomain);

  if (!tenant) {
    return NextResponse.rewrite(new URL('/tenant-not-found', request.url));
  }

  // 5. Attach Context
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenant.id);
  requestHeaders.set('x-tenant-slug', tenant.slug);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/_content
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
