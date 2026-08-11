'use client';

import Link from 'next/link';
import { useSafeTranslation } from '@shared/lib';
import { useLocalStorage } from 'usehooks-ts';
import { authClient, trpc } from '@api/client';
import { ServicesCommandBar, type ServicesCommandBarUrgency } from './ServicesCommandBar';
import { SERVICES_DOMAIN_DEFINITIONS } from './ServicesSubLauncher';
import {
  Wrench,
  Calendar,
  Building2,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  Trophy,
  MessageSquare,
  Scale,
  Store,
  GraduationCap,
  Users,
  UserCog,
  BookOpen,
  Leaf,
  Wallet,
  Settings,
  type LucideIcon,
} from 'lucide-react';

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

const DOMAIN_ICONS: Record<string, LucideIcon> = {
  maintenance: Wrench,
  bookings: Calendar,
  amenities: Building2,
  'my-services': Briefcase,
  events: CalendarDays,
  surveys: ClipboardCheck,
  competitions: Trophy,
  communication: MessageSquare,
  disputes: Scale,
  marketplace: Store,
  education: GraduationCap,
  directory: Users,
  groups: UserCog,
  resources: BookOpen,
  conservation: Leaf,
  wallet: Wallet,
  settings: Settings,
};

const DOMAIN_COLORS: Record<string, string> = {
  maintenance: 'bg-orange-100 text-orange-600',
  bookings: 'bg-blue-100 text-blue-600',
  amenities: 'bg-green-100 text-green-600',
  'my-services': 'bg-purple-100 text-purple-600',
  events: 'bg-pink-100 text-pink-600',
  surveys: 'bg-teal-100 text-teal-600',
  competitions: 'bg-amber-100 text-amber-600',
  communication: 'bg-indigo-100 text-indigo-600',
  disputes: 'bg-red-100 text-red-600',
  marketplace: 'bg-cyan-100 text-cyan-600',
  education: 'bg-rose-100 text-rose-600',
  directory: 'bg-sky-100 text-sky-600',
  groups: 'bg-emerald-100 text-emerald-600',
  resources: 'bg-violet-100 text-violet-600',
  conservation: 'bg-lime-100 text-lime-600',
  wallet: 'bg-yellow-100 text-yellow-600',
  settings: 'bg-gray-100 text-gray-600',
};

// ═══════════════════════════════════════════════════════════════
// DOMAIN GRID CARD
// ═══════════════════════════════════════════════════════════════

function DomainCard({
  domain,
  badge,
  descriptionKey,
}: {
  domain: { id: string; labelKey: string; descriptionKey?: string };
  badge: number;
  descriptionKey?: string;
}) {
  const { tx } = useSafeTranslation('services');
  const Icon = DOMAIN_ICONS[domain.id] || Settings;
  const descKey = descriptionKey ?? domain.descriptionKey;
  const tooltip = descKey ? tx(descKey, DOMAIN_FALLBACKS[descKey] || '') : undefined;

  return (
    <Link
      href={SERVICES_ROUTE_OVERRIDES[domain.id] ?? `/dashboard/services/${domain.id}`}
      className="group flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow relative"
    >
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-lapis-deep text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {tooltip}
        </div>
      )}
      <div
        className={`relative flex items-center justify-center w-12 h-12 rounded-full ${DOMAIN_COLORS[domain.id] || 'bg-gray-100 text-gray-600'}`}
      >
        <Icon className="w-6 h-6" />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-gray-700 text-center">
        {tx(domain.labelKey, DOMAIN_FALLBACKS[domain.labelKey] || domain.labelKey)}
      </span>
    </Link>
  );
}

function ServiceLinkCard({
  href,
  iconId,
  label,
  rawLabel,
  descriptionKey,
}: {
  href: string;
  iconId: string;
  label: string;
  rawLabel?: string;
  descriptionKey?: string;
}) {
  const { tx } = useSafeTranslation('services');
  const Icon = DOMAIN_ICONS[iconId] || Settings;
  const displayLabel = rawLabel ?? tx(label, DOMAIN_FALLBACKS[label] || label);
  const tooltip = descriptionKey
    ? tx(descriptionKey, DOMAIN_FALLBACKS[descriptionKey] || '')
    : undefined;

  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow relative"
    >
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-lapis-deep text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {tooltip}
        </div>
      )}
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-full ${DOMAIN_COLORS[iconId] || 'bg-gray-100 text-gray-600'}`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-sm font-medium text-gray-700 text-center">{displayLabel}</span>
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

  return (
    <div className="relative min-h-screen">
      {/* Pattern background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/platform/patterns/pattern.png)',
          backgroundRepeat: 'repeat',
          backgroundSize: '500px',
        }}
      />
      {/* White wash overlay */}
      <div className="absolute inset-0 bg-white/80" />
      {/* Content */}
      <div className="relative p-6 max-w-5xl mx-auto space-y-6">
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
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            <ServiceLinkCard
              href="/directory"
              iconId="directory"
              label="domains.directory"
              descriptionKey="domains.descriptions.directory"
            />
            <ServiceLinkCard
              href="/groups"
              iconId="groups"
              label="domains.groups"
              descriptionKey="domains.descriptions.groups"
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
              <ServiceLinkCard
                href="/admin/groups"
                iconId="groups"
                label="Group Admin"
                descriptionKey="domains.descriptions.teams"
              />
            )}
          </div>
        </section>

        {/* Row 3: Learning & Growth */}
        <section aria-label="Learning and growth">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {tx('sections.learningGrowth', 'Learning & Growth')}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            <ServiceLinkCard
              href="/education"
              iconId="education"
              label="domains.education"
              descriptionKey="domains.descriptions.education"
            />
            <ServiceLinkCard
              href="/resources"
              iconId="resources"
              label="domains.resources"
              descriptionKey="domains.descriptions.resources"
            />
            <ServiceLinkCard
              href="/conservation"
              iconId="conservation"
              label="domains.conservation"
              descriptionKey="domains.descriptions.conservation"
            />
          </div>
        </section>

        {/* Row 4: Finance & Markets */}
        <section aria-label="Finance and markets">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {tx('sections.financeAndMarkets', 'Finance & Markets')}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            <ServiceLinkCard
              href="/dashboard/wallet"
              iconId="wallet"
              label="dWallet"
              rawLabel="dWallet"
              descriptionKey="dWallet.subheading"
            />
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
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            <ServiceLinkCard
              href="/profile"
              iconId="settings"
              label="settings.title"
              descriptionKey="settings.description"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

export default ServicesLayer;
