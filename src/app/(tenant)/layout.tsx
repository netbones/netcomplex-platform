import '../globals.css';
import { Providers } from '../providers';
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

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();

  return (
    <TenantProvider tenant={tenant}>
      <Toaster position="top-right" />
      <Suspense fallback={null}>{children}</Suspense>
    </TenantProvider>
  );
}
