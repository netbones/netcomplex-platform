'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from 'usehooks-ts';
import { authClient } from '@api/client';
import { ErrorBoundary } from '@shared/ui';
import { AdminCommandBar, type CommandBarUrgency } from './AdminCommandBar';
import { ADMIN_DOMAIN_DEFINITIONS, type AdminDomainDef } from './AdminSubLauncher';

// Domain ID → actual admin route override for domains whose page name differs
const ADMIN_ROUTE_OVERRIDES: Record<string, string> = {
  maintenance: '/admin/requests',
  system: '/admin/categories',
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

function DomainCard({ domain, badge }: { domain: AdminDomainDef; badge: number }) {
  const { t } = useTranslation('admin');
  const DomainIcon = domain.icon;

  return (
    <Link
      href={ADMIN_ROUTE_OVERRIDES[domain.id] ?? `/admin/${domain.id}`}
      className="group relative flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
    >
      <div className="flex-shrink-0 p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition">
        <DomainIcon className="w-5 h-5 text-indigo-600" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate">
          {t(domain.labelKey)}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t(domain.descriptionKey)}</p>
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
  const { t } = useTranslation('admin');
  const { data: session } = authClient.useSession();

  const [urgency, setUrgency] = useState<UrgencyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Persistent shortcut customisation (per user)
  const [activeShortcuts, setActiveShortcuts] = useLocalStorage<string[]>('admin-shortcuts', []);

  const isPlatformAdmin = session?.user?.role?.toUpperCase() === 'ADMIN';

  const fetchUrgency = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/admin/urgency');
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
    return <AdminLayerError onRetry={fetchUrgency} />;
  }

  if (loading || !urgency) {
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
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('domains.heading')}</h2>
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
