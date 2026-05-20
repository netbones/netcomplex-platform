'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useContactSettings } from '@/shared/lib/useContactSettings';
import { usePageFlags } from '@/shared/lib/hooks/usePageFlags';
import { getHeaderItems, getMoreDropdownItems } from '@/shared/lib/navigation-config';

export function Footer() {
  const [mounted, setMounted] = useState(false);
  const { t, ready } = useTranslation('common');
  const { contacts, loading } = useContactSettings();
  const { flags } = usePageFlags();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !ready || !flags) {
    return (
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="container mx-auto px-4 py-12">
          <p className="text-gray-300 text-sm">Loading...</p>
        </div>
      </footer>
    );
  }

  const formatPhone = (phone: string | undefined) => phone?.replace(/\D/g, '') || '';

  // Quick Links: header items + the non-header engagement item
  const headerItems = getHeaderItems(flags);
  const moreItems = getMoreDropdownItems(flags);

  // Find the engagement item that's NOT in the header (the "other" one)
  const engagementInMore = moreItems.find(
    item => item.href === '/conservation' || item.href === '/campaign'
  );

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Column 1: Brand */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img
                src="/logo.png"
                alt="Soralia Village Logo"
                className="w-12 h-12 rounded-full bg-white p-1 shadow-md object-cover"
              />
              <div>
                <h3 className="text-xl font-bold">{t('app.name')}</h3>
                <p className="text-sm text-gray-300">{t('app.tagline')}</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-4">{t('footer.description')}</p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-soralia-accent transition-colors">
                <i className="fab fa-facebook text-xl" aria-hidden="true"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-soralia-accent transition-colors">
                <i className="fab fa-twitter text-xl" aria-hidden="true"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-soralia-accent transition-colors">
                <i className="fab fa-instagram text-xl" aria-hidden="true"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-soralia-accent transition-colors">
                <i className="fab fa-linkedin text-xl" aria-hidden="true"></i>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links — driven by navigation-config */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              {headerItems.map(item => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-yellow-400 transition-colors text-sm"
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
              {engagementInMore && (
                <li>
                  <Link
                    href={engagementInMore.href}
                    className="text-gray-300 hover:text-yellow-400 transition-colors text-sm"
                  >
                    {t(engagementInMore.labelKey)}
                  </Link>
                </li>
              )}
              {flags.dashboard !== false && (
                <li>
                  <Link
                    href="/dashboard"
                    className="text-gray-300 hover:text-yellow-400 transition-colors text-sm"
                  >
                    {t('nav.dashboard')}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Column 3: Services — gate with page flags */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.services')}</h4>
            <ul className="space-y-2">
              {flags.maintenance !== false && (
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
              {flags.events !== false && (
                <li>
                  <Link
                    href="/resources#events"
                    className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                  >
                    {t('footer.events')}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: Contact Us */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.contactUs')}</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <i
                  className="fas fa-map-marker-alt text-soralia-accent mt-1"
                  aria-hidden="true"
                ></i>
                <div>
                  <p className="text-gray-300 text-sm">{t('app.name')}</p>
                  <p className="text-gray-300 text-sm">Cape Town, South Africa</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <i className="fas fa-phone text-soralia-accent" aria-hidden="true"></i>
                <a
                  href="tel:+27215550000"
                  className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                >
                  +27 21 555-0000
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <i className="fas fa-envelope text-soralia-accent" aria-hidden="true"></i>
                <a
                  href="mailto:info@soralia.co.za"
                  className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                >
                  info@soralia.co.za
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <i className="fas fa-clock text-soralia-accent" aria-hidden="true"></i>
                <div>
                  <p className="text-gray-300 text-sm">{t('footer.officeHours')}:</p>
                  <p className="text-gray-300 text-sm">{t('footer.officeHoursValue')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency contacts */}
        <div className="border-t border-gray-600 pt-8 mb-8">
          <h4 className="text-lg font-semibold mb-4 text-center">
            {t('footer.emergencyContacts')}
          </h4>
          {loading ? (
            <div className="text-center text-gray-400">Loading contacts...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-600 rounded-lg p-4 text-center">
                <i className="fas fa-exclamation-triangle text-2xl mb-2" aria-hidden="true"></i>
                <h5 className="font-semibold">{t('footer.emergency')}</h5>
                <a
                  href={`tel:${formatPhone(contacts.emergency)}`}
                  className="text-sm hover:underline"
                >
                  {contacts.emergency}
                </a>
              </div>
              <div className="bg-orange-600 rounded-lg p-4 text-center">
                <i className="fas fa-shield-alt text-2xl mb-2" aria-hidden="true"></i>
                <h5 className="font-semibold">{t('footer.security')}</h5>
                <a
                  href={`tel:${formatPhone(contacts.security)}`}
                  className="text-sm hover:underline"
                >
                  {contacts.security}
                </a>
              </div>
              <div className="bg-green-600 rounded-lg p-4 text-center">
                <i className="fas fa-tools text-2xl mb-2" aria-hidden="true"></i>
                <h5 className="font-semibold">{t('footer.maintenance')}</h5>
                <a
                  href={`tel:${formatPhone(contacts.maintenance)}`}
                  className="text-sm hover:underline"
                >
                  {contacts.maintenance}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Lower footer — Legal & Utility */}
        <div className="border-t border-gray-600 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <p className="text-gray-300 text-sm">
                &copy; {new Date().getFullYear()} {t('footer.copyright')}
              </p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-end space-x-6">
              <Link
                href="/privacy"
                className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
              >
                {t('footer.privacy')}
              </Link>
              <Link
                href="/terms"
                className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
              >
                {t('footer.terms')}
              </Link>
              <Link
                href="/guidelines"
                className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
              >
                {t('footer.guidelines')}
              </Link>
              <Link
                href="/resources#contacts"
                className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
              >
                {t('footer.contact')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
