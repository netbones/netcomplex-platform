'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSafeTranslation } from '@shared/lib';
import { useLocalStorage } from 'usehooks-ts';
import { ServicesCommandBar, type ServicesCommandBarUrgency } from './ServicesCommandBar';
import { SERVICES_DOMAIN_DEFINITIONS, type ServicesDomainDef } from './ServicesSubLauncher';

const DOMAIN_FALLBACKS: Record<string, string> = {
  'domains.maintenance': 'Maintenance',
  'domains.bookings': 'Bookings',
  'domains.amenities': 'Amenities',
  'domains.myServices': 'My Services',
  'domains.events': 'Events',
  'domains.surveys': 'Surveys',
  'domains.competitions': 'Competitions',
  'domains.communication': 'Communication',
  'domains.descriptions.maintenance': 'Submit and track maintenance requests',
  'domains.descriptions.bookings': 'Reserve community facilities',
  'domains.descriptions.amenities': 'Explore community amenities',
  'domains.descriptions.myServices': 'View your service history and inquiries',
  'domains.descriptions.events': 'Upcoming community events',
  'domains.descriptions.surveys': 'Share your feedback',
  'domains.descriptions.competitions': 'Enter community competitions',
  'domains.descriptions.communication': 'Messages and announcements',
  'domains.marketplace': 'Marketplace',
  'domains.descriptions.marketplace': 'Browse and book community service providers',
  'domains.education': 'Education Portal',
  'domains.descriptions.education': 'Bursaries, scholarships, and free learning resources',
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface UrgencyResponse {
  commandBar: ServicesCommandBarUrgency;
  domainBadges: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// DOMAIN GRID CARD
// ═══════════════════════════════════════════════════════════════

function DomainCard({ domain, badge }: { domain: ServicesDomainDef; badge: number }) {
  const { tx } = useSafeTranslation('services');

  return (
    <Link
      href={`/dashboard/services/${domain.id}`}
      className="group relative flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
    >
      <div className="flex-shrink-0 w-10 h-10">
        <img src={domain.icon} alt="" className="w-full h-full" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate">
          {tx(domain.labelKey, DOMAIN_FALLBACKS[domain.labelKey] || domain.labelKey)}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
          {tx(
            domain.descriptionKey,
            DOMAIN_FALLBACKS[domain.descriptionKey] || domain.descriptionKey
          )}
        </p>
      </div>
      {/* Urgency badge — only shown if count > 0 */}
      {badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold shadow-sm">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════
// SKELETON / ERROR STATES
// ═══════════════════════════════════════════════════════════════

function ServicesLayerSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
      {/* CommandBar skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-24" />
      {/* Service Areas skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-32 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-20" />
          ))}
        </div>
      </div>
      {/* Competitions & Surveys skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-48 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-20" />
          ))}
        </div>
      </div>
      {/* My Learning skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-28 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <div className="bg-gray-100 rounded-lg h-20" />
        </div>
      </div>
    </div>
  );
}

function ServicesLayerError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700 mb-2">Failed to load services dashboard</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-sm text-red-600 underline hover:text-red-800 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ServicesLayer() {
  const { tx } = useSafeTranslation('services');
  const [activeShortcuts, setActiveShortcuts] = useLocalStorage<string[]>('services-shortcuts', []);
  const [urgency, setUrgency] = useState<UrgencyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchUrgency = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/services/urgency');
      if (!res.ok) throw new Error('Failed');
      const body = await res.json();
      // Unwrap canonical apiSuccess envelope
      const data = body.success ? body.data : body;
      setUrgency(data as UrgencyResponse);
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUrgency();
  }, [fetchUrgency]);

  if (error) {
    return <ServicesLayerError onRetry={fetchUrgency} />;
  }

  if (loading || !urgency) {
    return <ServicesLayerSkeleton />;
  }

  const serviceDomains = SERVICES_DOMAIN_DEFINITIONS.filter(
    d => d.id !== 'surveys' && d.id !== 'competitions' && d.id !== 'marketplace'
  );
  const engagementDomains = SERVICES_DOMAIN_DEFINITIONS.filter(
    d => d.id === 'surveys' || d.id === 'competitions'
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Section: Command Bar (reactive CTAs + creation shortcuts) */}
      <section aria-label="Services command bar">
        <ServicesCommandBar
          urgency={urgency.commandBar}
          activeShortcuts={activeShortcuts}
          onShortcutsChange={setActiveShortcuts}
        />
      </section>

      {/* Section: Service Areas */}
      <section aria-label="Service areas">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {tx('sections.serviceAreas', 'Service Areas')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {serviceDomains.map(domain => (
            <DomainCard
              key={domain.id}
              domain={domain}
              badge={urgency.domainBadges[domain.id] ?? 0}
            />
          ))}
        </div>
      </section>

      {/* Section: Competitions, Surveys & Campaigns */}
      <section aria-label="Competitions, surveys and campaigns">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {tx('sections.competitionsAndSurveys', 'Competitions & Surveys')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {engagementDomains.map(domain => (
            <DomainCard
              key={domain.id}
              domain={domain}
              badge={urgency.domainBadges[domain.id] ?? 0}
            />
          ))}
          <Link
            href="/campaign"
            className="group relative flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
          >
            <div className="flex-shrink-0 w-10 h-10">
              <img src="/platform/campaigns.svg" alt="" className="w-full h-full" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate">
                {tx('campaigns.title', 'Campaigns')}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {tx('campaigns.description', 'Community pride campaigns and initiatives')}
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Section: My Learning */}
      <section aria-label="My Learning">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {tx('sections.myLearning', 'My Learning')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <Link
            href="/education"
            className="group relative flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
          >
            <div className="flex-shrink-0 w-10 h-10">
              <img src="/platform/education-red.svg" alt="" className="w-full h-full" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate">
                {tx('domains.education', 'Education Portal')}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {tx(
                  'domains.descriptions.education',
                  'Bursaries, scholarships, and free learning resources'
                )}
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Section: Finance & Markets */}
      <section aria-label="Finance & Markets">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {tx('sections.financeAndMarkets', 'Finance & Markets')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <Link
            href="/dashboard/wallet"
            className="group relative flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
          >
            <div className="flex-shrink-0 w-10 h-10">
              <img src="/platform/wallet-red.svg" alt="" className="w-full h-full" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate">
                dWallet
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {tx('dWallet.subheading', 'Your data, your consent, your rewards')}
              </p>
            </div>
          </Link>
          {SERVICES_DOMAIN_DEFINITIONS.filter(d => d.id === 'marketplace').map(domain => (
            <DomainCard
              key={domain.id}
              domain={domain}
              badge={urgency.domainBadges[domain.id] ?? 0}
            />
          ))}
        </div>
      </section>

      {/* Section: Settings */}
      <section aria-label="Settings">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {tx('settings.title', 'Settings')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <Link
            href="/profile"
            className="group relative flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
          >
            <div className="flex-shrink-0 w-10 h-10">
              <img src="/platform/settings.svg" alt="" className="w-full h-full" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate">
                {tx('settings.title', 'Settings')}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {tx('settings.description', 'Manage your account, privacy, and preferences')}
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default ServicesLayer;
