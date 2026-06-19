'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSafeTranslation } from '@shared/lib';
import { MessagesCommandBar, type MessagesCommandBarUrgency } from './MessagesCommandBar';
import { MESSAGES_DOMAIN_DEFINITIONS, type MessagesDomainDef } from './MessagesSubLauncher';

const DOMAIN_FALLBACKS: Record<string, string> = {
  'domains.conversations': 'Conversations',
  'domains.announcements': 'Announcements',
  'domains.notifications': 'Notifications',
  'domains.descriptions.conversations': 'Direct messages and group chats',
  'domains.descriptions.announcements': 'Community announcements and updates',
  'domains.descriptions.notifications': 'System notifications and alerts',
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface UrgencyResponse {
  commandBar: MessagesCommandBarUrgency;
  domainBadges: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// DOMAIN GRID CARD
// ═══════════════════════════════════════════════════════════════

function DomainCard({ domain, badge }: { domain: MessagesDomainDef; badge: number }) {
  const { tx } = useSafeTranslation('messages');
  const DomainIcon = domain.icon;

  return (
    <Link
      href={`/dashboard/communication/${domain.id}`}
      className="group relative flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-100"
    >
      <div className="flex-shrink-0 p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition">
        <DomainIcon className="w-5 h-5 text-indigo-600" />
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

function MessagesLayerSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
      {/* CommandBar skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-24" />
      {/* Domain grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg h-20" />
        ))}
      </div>
    </div>
  );
}

function MessagesLayerError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700 mb-2">Failed to load messages dashboard</p>
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

export function MessagesLayer() {
  const { tx } = useSafeTranslation('messages');

  const [urgency, setUrgency] = useState<UrgencyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchUrgency = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/messages/urgency');
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
    return <MessagesLayerError onRetry={fetchUrgency} />;
  }

  if (loading || !urgency) {
    return <MessagesLayerSkeleton />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Section: Command Bar (reactive CTAs + creation shortcuts) */}
      <section aria-label="Messages command bar">
        <MessagesCommandBar urgency={urgency.commandBar} />
      </section>

      {/* Section: Domain Grid (2-col → 3-col responsive) */}
      <section aria-label="Communication domains">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Communication</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MESSAGES_DOMAIN_DEFINITIONS.map(domain => (
            <DomainCard
              key={domain.id}
              domain={domain}
              badge={urgency.domainBadges[domain.id] ?? 0}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default MessagesLayer;
