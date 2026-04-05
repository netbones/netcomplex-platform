import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Suspense } from 'react';
import { Metadata } from 'next';
import { Toaster } from 'sonner';
import { TenantProvider } from '@/components/tenant/TenantProvider';
import { getCurrentTenant } from '@/lib/tenant';

export const metadata: Metadata = {
  title: 'Soralia Village Community Directory',
  description: 'A premier residential community in Cape Town',
};

const defaultTenant = {
  id: '',
  name: 'Soralia Village',
  slug: 'soralia',
  primaryColor: '#4F46E5',
  accentColor: '#F59E0B',
  secondaryColor: '#10B981',
  logoUrl: '',
  faviconUrl: '',
  fontFamily: 'Inter',
};

async function getTenant() {
  try {
    const tenant = await getCurrentTenant();
    if (tenant) {
      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        primaryColor: tenant.primaryColor,
        accentColor: tenant.accentColor || '#F59E0B',
        secondaryColor: tenant.secondaryColor || '#10B981',
        logoUrl: tenant.logoUrl || '',
        faviconUrl: tenant.faviconUrl || '',
        fontFamily: tenant.fontFamily || 'Inter',
      };
    }
  } catch {
    // Ignore errors during render
  }
  return defaultTenant;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body className="bg-soralia-light min-h-screen flex flex-col">
        <Providers>
          <TenantProvider tenant={tenant}>
            <Toaster position="top-right" />
            <Suspense fallback={null}>
              <Header />
              <main className="flex-grow">{children}</main>
              <Footer />
            </Suspense>
          </TenantProvider>
        </Providers>
      </body>
    </html>
  );
}
