'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useContactSettings } from '@/shared/lib/hooks/useContactSettings';
import { useGateContext } from '@features/gate';
import { NAV_REGISTRY, isNavItemVisible } from '@/shared/lib/nav';
import { authClient } from '@api/client';
import { useTenant } from '@entities/tenant';

export function Footer() {
  const [mounted, setMounted] = useState(false);
  const { t, ready } = useTranslation('common');
  const { contacts } = useContactSettings();
  const ctx = useGateContext();
  const { data: session } = authClient.useSession();
  const tenant = useTenant();
  const tenantName = tenant?.name || 'Netcomplex Demo Village';

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

  const formatPhone = (phone: string | undefined) => phone?.replace(/\D/g, '') || '';
  const role = session?.user?.role;
  const { flags } = ctx;

  const quickLinks = NAV_REGISTRY.filter(
    item =>
      isNavItemVisible(item, flags, role) &&
      !item.id.startsWith('dashboard') &&
      !['dashboard', 'bookings', 'messages', 'maintenance'].includes(item.id)
  );

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img
                src={tenant?.logoUrl || '/logo.png'}
                alt={`${tenantName} Logo`}
                className="w-12 h-12 rounded-full bg-white p-1 shadow-md object-cover"
              />
              <div>
                <h3 className="text-xl font-bold">{t('app.name', { tenantName })}</h3>
                <p className="text-sm text-gray-300">{t('app.tagline')}</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-4">{t('footer.description')}</p>
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
                  href="/services#security"
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
                Cape Town, South Africa
              </p>
              <a
                href={`tel:${formatPhone(contacts.emergency)}`}
                className="block hover:text-soralia-accent"
              >
                {contacts.emergency}
              </a>
              <a href="mailto:info@netcomplex.co.za" className="block hover:text-soralia-accent">
                info@netcomplex.co.za
              </a>
            </div>
          </div>
        </div>

        {/* Simplified emergency section... */}
        <div className="border-t border-gray-600 pt-8 mt-8">
          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
