import './globals.css';
import { PostHogProvider, PostHogPageView } from '@posthog/next';
import { Providers } from './providers';
import { Suspense } from 'react';
import { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Header } from '@shared/ui';
import { Footer } from '@shared/ui';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Soralia Village Community Directory',
  description: 'A premier residential community in Cape Town',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const locale = headersList.get('x-locale') || 'en';
  const plane = headersList.get('x-plane') || 'tenant';
  const isTenant = plane === 'tenant';
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
          <Providers>
            {isTenant && <Header />}
            <Suspense fallback={null}>{children}</Suspense>
            {isTenant && <Footer />}
          </Providers>
        </PostHogProvider>
      </body>
    </html>
  );
}
