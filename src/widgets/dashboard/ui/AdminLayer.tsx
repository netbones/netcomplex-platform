'use client';

import { lazy, Suspense } from 'react';
import Link from 'next/link';
import { useSafeTranslation } from '@shared/lib';
import { useLocalStorage } from 'usehooks-ts';
import { authClient } from '@api/client';
import { useAdminUrgency } from '@features/admin';
import { ErrorBoundary } from '@shared/ui';
import { AdminCommandBar, type CommandBarUrgency } from './AdminCommandBar';
import {
  ADMIN_DOMAIN_DEFINITIONS,
  ADMIN_DOMAIN_CATEGORIES,
  groupDomainsByCategory,
} from './AdminSubLauncher';
import {
  Users,
  Wrench,
  FileText,
  CalendarDays,
  Trophy,
  BookOpen,
  ClipboardCheck,
  Megaphone,
  Award,
  Scale,
  ShieldCheck,
  Store,
  Wallet,
  Building2,
  Image as ImageIcon,
  GraduationCap,
  UserCog,
  Settings,
  Zap,
  type LucideIcon,
} from 'lucide-react';

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
  'domains.achievements': 'Achievements',
  'domains.disputes': 'Disputes',
  'domains.merits': 'Merits',
  'domains.system': 'System',
  'domains.providers': 'Providers',
  'domains.bookings': 'Bookings',
  'domains.services': 'Services',
  'domains.carousel': 'Carousel',
  'domains.dwallet': 'dWallet',
  'domains.descriptions.users': 'Manage community members and roles',
  'domains.descriptions.maintenance': 'Maintenance request management and analytics',
  'domains.descriptions.content': 'Content publishing and moderation',
  'domains.descriptions.events': 'Community event management',
  'domains.descriptions.competitions': 'Competition setup and results',
  'domains.descriptions.resources': 'Community resource management',
  'domains.descriptions.surveys': 'Survey creation and results',
  'domains.descriptions.announcements': 'Announcement creation and management',
  'domains.descriptions.achievements': 'Achievement configuration and catalog',
  'domains.descriptions.disputes': 'Dispute moderation and resolution',
  'domains.descriptions.merits': 'Community merit management and disputes',
  'domains.descriptions.system': 'Platform configuration and health',
  'domains.descriptions.providers': 'Provider management, revenue, and moderation',
  'domains.descriptions.services': 'Configure the public services page',
  'domains.descriptions.carousel': 'Manage homepage hero carousel slides',
  'domains.descriptions.dwallet': 'Community value distribution and payout management',
  'domains.descriptions.adminBookings': 'Manage bookable facilities and settings',
  'domains.teams': 'Teams',
  'domains.descriptions.teams': 'Manage in-house maintenance teams',
  'domains.categories.community': 'Community Engagement & Growth',
  'domains.categories.operations': 'Operational & Facility Management',
  'domains.categories.financial': 'Financial & Ecosystem Infrastructure',
  'domains.categories.system': 'System Administration',
};

const ADMIN_DOMAIN_ICONS: Record<string, LucideIcon> = {
  users: Users,
  maintenance: Wrench,
  content: FileText,
  events: CalendarDays,
  competitions: Trophy,
  resources: BookOpen,
  surveys: ClipboardCheck,
  announcements: Megaphone,
  merits: ShieldCheck,
  achievements: Award,
  disputes: Scale,
  dwallet: Wallet,
  providers: Store,
  bookings: Building2,
  services: Zap,
  carousel: ImageIcon,
  education: GraduationCap,
  teams: UserCog,
  system: Settings,
  gallery: ImageIcon,
};

const ADMIN_DOMAIN_COLORS: Record<string, string> = {
  users: 'bg-blue-100 text-blue-600',
  maintenance: 'bg-orange-100 text-orange-600',
  content: 'bg-violet-100 text-violet-600',
  events: 'bg-pink-100 text-pink-600',
  competitions: 'bg-amber-100 text-amber-600',
  resources: 'bg-teal-100 text-teal-600',
  surveys: 'bg-cyan-100 text-cyan-600',
  announcements: 'bg-indigo-100 text-indigo-600',
  merits: 'bg-emerald-100 text-emerald-600',
  achievements: 'bg-rose-100 text-rose-600',
  disputes: 'bg-red-100 text-red-600',
  dwallet: 'bg-yellow-100 text-yellow-600',
  providers: 'bg-sky-100 text-sky-600',
  bookings: 'bg-green-100 text-green-600',
  services: 'bg-purple-100 text-purple-600',
  carousel: 'bg-lime-100 text-lime-600',
  education: 'bg-fuchsia-100 text-fuchsia-600',
  teams: 'bg-slate-100 text-slate-600',
  system: 'bg-gray-100 text-gray-600',
  gallery: 'bg-stone-100 text-stone-600',
};

// ── Grouped domain grid ──

function AdminDomainGrid({
  urgency,
  tx,
}: {
  urgency: UrgencyResponse;
  tx: ReturnType<typeof useSafeTranslation>['tx'];
}) {
  const grouped = groupDomainsByCategory(ADMIN_DOMAIN_DEFINITIONS);

  return (
    <div className="space-y-6">
      {ADMIN_DOMAIN_CATEGORIES.map(cat => {
        const domains = grouped[cat.id];
        if (domains.length === 0) return null;
        return (
          <div key={cat.id}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {tx(cat.labelKey, DOMAIN_FALLBACKS[cat.labelKey] || cat.description)}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {domains.map(domain => (
                <DomainCard
                  key={domain.id}
                  domain={domain}
                  badge={urgency.domainBadges[domain.id] ?? 0}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── DomainCard ──

function DomainCard({
  domain,
  badge,
}: {
  domain: { id: string; labelKey: string };
  badge: number;
}) {
  const { tx } = useSafeTranslation('admin');
  const Icon = ADMIN_DOMAIN_ICONS[domain.id] || Settings;

  return (
    <Link
      href={ADMIN_ROUTE_OVERRIDES[domain.id] ?? `/admin/${domain.id}`}
      className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
    >
      <div
        className={`relative flex items-center justify-center w-12 h-12 rounded-full ${ADMIN_DOMAIN_COLORS[domain.id] || 'bg-gray-100 text-gray-600'}`}
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

      {/* Section: Domain Grid — grouped by category */}
      <section aria-label="Management domains">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {tx('domains.heading', 'Management Domains')}
        </h2>
        <AdminDomainGrid urgency={urgency} tx={tx} />
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
