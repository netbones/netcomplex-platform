'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useGateContext } from '@features/gate';
import { NAV_REGISTRY, isNavItemVisible } from '@/shared/lib/nav';
import { authClient } from '@api/client';
import { useTenant } from '@entities/tenant';

export function Footer() {
  const [mounted, setMounted] = useState(false);
  const { t, ready } = useTranslation('common');
  const ctx = useGateContext();
  const { data: session } = authClient.useSession();
  const tenant = useTenant();
  const tenantName = tenant?.name || 'Netcomplex Demo Village';
  const tenantDescription =
    tenant?.description ||
    'A premier residential community in Cape Town, offering modern living with exceptional amenities and services.';
  const tenantAddress = tenant?.address || 'Cape Town, South Africa';
  const tenantTelephone = tenant?.telephone || '';
  const tenantEmail = tenant?.email || '';
  const governanceLabel = tenant?.governanceLabel || 'Homeowners Association';

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !ready || !ctx?.flags) {
    return (
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="container mx-auto px-4 py-12">
          <p className="text-gray-300 text-sm">Loading...</p>
        </div>
      </footer>
    );
  }

  const role = session?.user?.role;
  const { flags } = ctx;

  const quickLinks = NAV_REGISTRY.filter(
    item =>
      isNavItemVisible(item, flags, role) &&
      !item.id.startsWith('dashboard') &&
      !['dashboard', 'bookings', 'messages', 'maintenance', 'security'].includes(item.id)
  );

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <Image
                src={tenant?.logoUrl || '/logo.png'}
                alt={`${tenantName} Logo`}
                width={48}
                height={48}
                className="rounded-full bg-white p-1 shadow-md object-cover"
                unoptimized
              />
              <div>
                <h3 className="text-xl font-bold">{t('app.name', { tenantName })}</h3>
                <p className="text-sm text-gray-300">
                  {t('app.tagline', { tagline: tenant?.tagline || 'A Community of Neighbors' })}
                </p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              {t('footer.description', { description: tenantDescription })}
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              {quickLinks.map(item => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-yellow-400 transition-colors text-sm"
                  >
                    {t(item.nameKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.services')}</h4>
            <ul className="space-y-2">
              {isNavItemVisible(NAV_REGISTRY.find(i => i.id === 'maintenance')!, flags, role) && (
                <li>
                  <Link
                    href="/services#maintenance"
                    className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                  >
                    {t('footer.maintenance')}
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href="/security"
                  className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                >
                  {t('footer.security')}
                </Link>
              </li>
              <li>
                <Link
                  href="/services#landscaping"
                  className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                >
                  {t('footer.landscaping')}
                </Link>
              </li>
              <li>
                <Link
                  href="/services#amenities"
                  className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                >
                  {t('footer.amenities')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.contactUs')}</h4>
            <div className="space-y-3 text-sm text-gray-300">
              <p>
                {t('app.name', { tenantName })}
                <br />
                {t('footer.address', { address: tenantAddress })}
              </p>
              <a href={`tel:${tenantTelephone}`} className="block hover:text-soralia-accent">
                {t('footer.telephone', { telephone: tenantTelephone })}
              </a>
              <a href={`mailto:${tenantEmail}`} className="block hover:text-soralia-accent">
                {t('footer.email', { email: tenantEmail })}
              </a>
            </div>
          </div>
        </div>

        {/* Simplified emergency section... */}
        <div className="border-t border-gray-600 pt-8 mt-8">
          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()}{' '}
            {t('footer.copyright', { tenantName, governanceLabel })}
          </p>
        </div>
      </div>
    </footer>
  );
}
