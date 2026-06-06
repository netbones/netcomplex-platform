import './globals.css';
import { Providers } from './providers';
import { Suspense } from 'react';
import { Metadata, Viewport } from 'next';
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
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body className="bg-soralia-light min-h-screen">
        <Providers>
          <Header />
          <Suspense fallback={null}>{children}</Suspense>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
