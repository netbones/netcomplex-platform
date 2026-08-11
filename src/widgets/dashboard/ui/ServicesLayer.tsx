'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSafeTranslation } from '@shared/lib';
import { useLocalStorage } from 'usehooks-ts';
import { authClient, trpc } from '@api/client';
import { ServicesCommandBar, type ServicesCommandBarUrgency } from './ServicesCommandBar';
import { SERVICES_DOMAIN_DEFINITIONS, type ServicesDomainDef } from './ServicesSubLauncher';

const SERVICES_ROUTE_OVERRIDES: Record<string, string> = {
  disputes: '/disputes',
};

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
  'domains.directory': 'Directory',
  'domains.descriptions.directory': 'Find and connect with neighbours',
  'domains.groups': 'Groups',
  'domains.descriptions.groups': 'Join community groups and committees',
  'domains.resources': 'Resources',
  'domains.descriptions.resources': 'Community documents and guidelines',
  'domains.conservation': 'Conservation',
  'domains.descriptions.conservation': 'Sustainability and conservation initiatives',
  dWallet: 'dWallet',
  'dWallet.subheading': 'Your data, your consent, your rewards',
  'settings.title': 'Settings',
  'settings.description': 'Manage your account, privacy, and preferences',
  'Group Admin': 'Group Admin',
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
      href={SERVICES_ROUTE_OVERRIDES[domain.id] ?? `/dashboard/services/${domain.id}`}
      className="group relative flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
    >
      <div className="flex-shrink-0 w-10 h-10 relative">
        <Image src={domain.icon} alt="" fill className="w-full h-full" />
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
      {/* Core Services skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-32 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-20" />
          ))}
        </div>
      </div>
      {/* Community & Engagement skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-48 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-20" />
          ))}
        </div>
      </div>
      {/* Learning & Growth skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-36 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-20" />
          ))}
        </div>
      </div>
      {/* Finance & Markets skeleton */}
      <div>
        <div className="h-6 bg-gray-200 rounded w-36 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-20" />
          ))}
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
  const { data: session } = authClient.useSession();
  const role = session?.user?.role;
  const {
    data: urgency,
    isLoading,
    isError,
    refetch,
  } = trpc.services.getUrgency.useQuery(undefined, {
    select: envelope => {
      const apiEnvelope = envelope as { success: boolean; data: UrgencyResponse };
      return apiEnvelope.data ?? null;
    },
  });

  if (isError) {
    return <ServicesLayerError onRetry={() => refetch()} />;
  }

  if (isLoading || !urgency) {
    return <ServicesLayerSkeleton />;
  }

  const isAdmin = role === 'ADMIN' || role === 'BOARD';

  const coreDomainIds = [
    'maintenance',
    'bookings',
    'amenities',
    'my-services',
    'events',
    'disputes',
  ];
  const engagementDomainIds = ['competitions', 'surveys', 'communication'];

  function ServiceLinkCard({
    href,
    icon,
    label,
    description,
  }: {
    href: string;
    icon: string;
    label: string;
    description: string;
  }) {
    return (
      <Link
        href={href}
        className="group relative flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
      >
        <div className="flex-shrink-0 w-10 h-10 relative">
          <Image src={icon} alt="" fill className="w-full h-full" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate">
            {tx(label, DOMAIN_FALLBACKS[label] || label)}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {tx(description, DOMAIN_FALLBACKS[description] || description)}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <div
      className="p-6 max-w-5xl mx-auto space-y-6 min-h-screen"
      style={{
        backgroundImage: 'url(/platform/patterns/pattern.png)',
        backgroundRepeat: 'repeat',
        backgroundSize: '500px',
      }}
    >
      {/* Command Bar */}
      <section aria-label="Services command bar">
        <ServicesCommandBar
          urgency={urgency.commandBar}
          activeShortcuts={activeShortcuts}
          onShortcutsChange={setActiveShortcuts}
        />
      </section>

      {/* Row 1: Core Services */}
      <section aria-label="Core services">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {tx('sections.coreServices', 'Core Services')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {SERVICES_DOMAIN_DEFINITIONS.filter(d => coreDomainIds.includes(d.id)).map(domain => (
            <DomainCard
              key={domain.id}
              domain={domain}
              badge={urgency.domainBadges[domain.id] ?? 0}
            />
          ))}
        </div>
      </section>

      {/* Row 2: Community & Engagement */}
      <section aria-label="Community and engagement">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {tx('sections.communityEngagement', 'Community & Engagement')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <ServiceLinkCard
            href="/directory"
            icon="/platform/users.svg"
            label="domains.directory"
            description="domains.descriptions.directory"
          />
          <ServiceLinkCard
            href="/groups"
            icon="/platform/teams-nc.svg"
            label="domains.groups"
            description="domains.descriptions.groups"
          />
          {SERVICES_DOMAIN_DEFINITIONS.filter(d => engagementDomainIds.includes(d.id)).map(
            domain => (
              <DomainCard
                key={domain.id}
                domain={domain}
                badge={urgency.domainBadges[domain.id] ?? 0}
              />
            )
          )}
          {isAdmin && (
            <Link
              href="/admin/groups"
              className="group relative flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
            >
              <div className="flex-shrink-0 w-10 h-10 relative">
                <Image src="/platform/system.svg" alt="" fill className="w-full h-full" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate">
                  Group Admin
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">Manage community groups</p>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Row 3: Learning & Growth */}
      <section aria-label="Learning and growth">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {tx('sections.learningGrowth', 'Learning & Growth')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <ServiceLinkCard
            href="/education"
            icon="/platform/education-red.svg"
            label="domains.education"
            description="domains.descriptions.education"
          />
          <ServiceLinkCard
            href="/resources"
            icon="/platform/resources.svg"
            label="domains.resources"
            description="domains.descriptions.resources"
          />
          <ServiceLinkCard
            href="/conservation"
            icon="/platform/conservation.svg"
            label="domains.conservation"
            description="domains.descriptions.conservation"
          />
        </div>
      </section>

      {/* Row 4: Finance & Markets */}
      <section aria-label="Finance and markets">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {tx('sections.financeAndMarkets', 'Finance & Markets')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <Link
            href="/dashboard/wallet"
            className="group relative flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
          >
            <div className="flex-shrink-0 w-10 h-10 relative">
              <Image src="/platform/wallet-red.svg" alt="" fill className="w-full h-full" />
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

      {/* Settings */}
      <section aria-label="Settings">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {tx('settings.title', 'Settings')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <ServiceLinkCard
            href="/profile"
            icon="/platform/settings.svg"
            label="settings.title"
            description="settings.description"
          />
        </div>
      </section>
    </div>
  );
}

export default ServicesLayer;
