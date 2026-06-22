'use client';

import { lazy, Suspense } from 'react';
import Link from 'next/link';
import { useSafeTranslation } from '@shared/lib';
import { useLocalStorage } from 'usehooks-ts';
import { authClient } from '@api/client';
import { useAdminUrgency } from '@features/admin';
import { ErrorBoundary } from '@shared/ui';
import { AdminCommandBar, type CommandBarUrgency } from './AdminCommandBar';
import { ADMIN_DOMAIN_DEFINITIONS, type AdminDomainDef } from './AdminSubLauncher';

// Domain ID → actual admin route override for domains whose page name differs
const ADMIN_ROUTE_OVERRIDES: Record<string, string> = {
  maintenance: '/admin/requests',
};

// Lazy-load activity stream (plan truth: lazy-loaded below domain grid)
const AdminActivityStream = lazy(() =>
  import('./AdminActivityStream').then(m => ({ default: m.AdminActivityStream }))
);

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface UrgencyResponse {
  commandBar: CommandBarUrgency;
  domainBadges: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// DOMAIN GRID CARD
// ═══════════════════════════════════════════════════════════════

const DOMAIN_FALLBACKS: Record<string, string> = {
  'domains.heading': 'Management Domains',
  'domains.users': 'Users',
  'domains.maintenance': 'Maintenance',
  'domains.content': 'Content',
  'domains.events': 'Events',
  'domains.competitions': 'Competitions',
  'domains.resources': 'Resources',
  'domains.surveys': 'Surveys',
  'domains.announcements': 'Announcements',
  'domains.merits': 'Merits',
  'domains.system': 'System',
  'domains.providers': 'Providers',
  'domains.bookings': 'Bookings',
  'domains.services': 'Services',
  'domains.descriptions.users': 'Manage community members and roles',
  'domains.descriptions.maintenance': 'Maintenance request management and analytics',
  'domains.descriptions.content': 'Content publishing and moderation',
  'domains.descriptions.events': 'Community event management',
  'domains.descriptions.competitions': 'Competition setup and results',
  'domains.descriptions.resources': 'Community resource management',
  'domains.descriptions.surveys': 'Survey creation and results',
  'domains.descriptions.announcements': 'Announcement creation and management',
  'domains.descriptions.merits': 'Community merit management and disputes',
  'domains.descriptions.system': 'Platform configuration and health',
  'domains.descriptions.providers': 'Provider management, revenue, and moderation',
  'domains.descriptions.services': 'Configure the public services page',
  'domains.descriptions.adminBookings': 'Manage bookable facilities and settings',
};

function DomainCard({ domain, badge }: { domain: AdminDomainDef; badge: number }) {
  const { tx } = useSafeTranslation('admin');

  return (
    <Link
      href={ADMIN_ROUTE_OVERRIDES[domain.id] ?? `/admin/${domain.id}`}
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

function AdminLayerSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
      {/* CommandBar skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-24" />
      {/* Domain grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg h-20" />
        ))}
      </div>
      {/* Activity skeleton */}
      <div className="bg-gray-100 rounded-lg h-64" />
    </div>
  );
}

function AdminLayerError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700 mb-2">Failed to load admin dashboard</p>
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

export function AdminLayer() {
  const { tx } = useSafeTranslation('admin');
  const { data: session } = authClient.useSession();

  const { data: urgency, isLoading, isError, refetch } = useAdminUrgency<UrgencyResponse>();

  // Persistent shortcut customisation (per user)
  const [activeShortcuts, setActiveShortcuts] = useLocalStorage<string[]>('admin-shortcuts', []);

  const isPlatformAdmin = session?.user?.role?.toUpperCase() === 'ADMIN';

  if (isError) {
    return <AdminLayerError onRetry={() => refetch()} />;
  }

  if (isLoading || !urgency) {
    return <AdminLayerSkeleton />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Section: Command Bar (reactive CTAs + creation shortcuts) */}
      <section aria-label="Admin command bar">
        <AdminCommandBar
          urgency={urgency.commandBar}
          isPlatformAdmin={isPlatformAdmin}
          activeShortcuts={activeShortcuts}
          onShortcutsChange={setActiveShortcuts}
        />
      </section>

      {/* Section: Domain Grid (3-col → 5-col responsive) */}
      <section aria-label="Management domains">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {tx('domains.heading', 'Management Domains')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {ADMIN_DOMAIN_DEFINITIONS.map(domain => (
            <DomainCard
              key={domain.id}
              domain={domain}
              badge={urgency.domainBadges[domain.id] ?? 0}
            />
          ))}
        </div>
      </section>

      {/* Section: Activity Stream (lazy-loaded) */}
      <section aria-label="Recent admin activity">
        <ErrorBoundary
          fallback={
            <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
              Activity stream unavailable
            </div>
          }
        >
          <Suspense
            fallback={
              <div className="bg-white rounded-lg border border-gray-200 p-4 h-64 animate-pulse" />
            }
          >
            <AdminActivityStream isPlatformAdmin={isPlatformAdmin} />
          </Suspense>
        </ErrorBoundary>
      </section>
    </div>
  );
}

export default AdminLayer;
