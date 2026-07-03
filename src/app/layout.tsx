import './globals.css';
import { PostHogProvider, PostHogPageView } from '@posthog/next';
import { Providers } from './providers';
import { Suspense } from 'react';
import { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Header } from '@shared/ui';
import { Footer } from '@shared/ui';
import { getCurrentTenant } from '@entities/tenant/server';
import { TenantProvider } from '@entities/tenant';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Netcomplex Community Platform',
  description: 'Multi-tenant community management platform',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const locale = headersList.get('x-locale') || 'en';
  const plane = headersList.get('x-plane') || 'tenant';
  const isTenant = plane === 'tenant';
  const raw = await getCurrentTenant();
  const tenant = raw
    ? {
        id: raw.id,
        name: raw.name,
        slug: raw.slug,
        tagline: raw.tagline ?? 'A Community of Neighbors',
        description:
          raw.description ??
          'A premier residential community in Cape Town, offering modern living with exceptional amenities and services.',
        address: raw.address ?? 'Cape Town, South Africa',
        telephone: raw.telephone ?? '',
        email: raw.email ?? '',
        primaryColor: raw.primaryColor,
        accentColor: raw.accentColor ?? '#F59E0B',
        secondaryColor: raw.secondaryColor ?? '#10B981',
        logoUrl: raw.logoUrl ?? '',
        faviconUrl: raw.faviconUrl ?? '',
        fontFamily: raw.fontFamily ?? 'Inter',
      }
    : {
        id: '',
        name: 'Netcomplex',
        slug: '',
        tagline: 'A Community of Neighbors',
        description:
          'A premier residential community in Cape Town, offering modern living with exceptional amenities and services.',
        address: 'Cape Town, South Africa',
        telephone: '',
        email: '',
        primaryColor: '#4F46E5',
        accentColor: '#F59E0B',
        secondaryColor: '#10B981',
        logoUrl: '',
        faviconUrl: '',
        fontFamily: 'Inter',
      };
  return (
    <html lang={locale}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body className="bg-soralia-light min-h-screen">
        <PostHogProvider
          apiKey={process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!}
          clientOptions={{ api_host: '/ingest' }}
          bootstrapFlags
        >
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <TenantProvider tenant={tenant}>
            <Providers>
              {isTenant && <Header />}
              <Suspense fallback={null}>{children}</Suspense>
              {isTenant && <Footer />}
            </Providers>
          </TenantProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
