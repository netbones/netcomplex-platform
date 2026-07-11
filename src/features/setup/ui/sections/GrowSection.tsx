'use client';

import { useState, useMemo } from 'react';
import type { TierLevel } from '@/entities/tenant';
import type { TenantSetup, SetupMission } from '@/entities/setup';
import { getRecommendations } from '../../model/recommendations';

interface GrowSectionProps {
  tenantId: string;
  tier: TierLevel;
  setup: TenantSetup | null;
  /** Current missions indexed by missionKey. */
  missions: Record<string, SetupMission>;
  /** Setup settings keyed by key. */
  settings: Record<string, unknown>;
  /** Called when user clicks "Complete" — navigates to mission config. */
  onComplete?: (missionKey: string) => void;
  /** Called when user clicks "Skip" — persists dismissal. */
  onSkip?: (missionKey: string) => void;
}

interface CardState {
  /** Mission keys that have been skipped this session. */
  skipped: Set<string>;
  /** Currently expanded learn-more card. */
  expandedKey: string | null;
}

/**
 * Grow section — displays dynamic recommendation cards in priority order.
 *
 * Each card shows an actionable recommendation with Complete, Skip, and
 * Learn More actions. Skipped recommendations are hidden for the session
 * and persisted via the onSkip callback.
 */
export default function GrowSection({
  tenantId: _tenantId,
  tier,
  setup,
  missions,
  settings,
  onComplete,
  onSkip,
}: GrowSectionProps) {
  const [state, setState] = useState<CardState>({
    skipped: new Set(),
    expandedKey: null,
  });

  // Derive recommendations — this is a pure computation, no side effects
  const recommendations = useMemo(() => {
    if (!setup) return [];
    return getRecommendations({
      setup,
      tier,
      missions,
      settings,
    });
  }, [setup, tier, missions, settings]);

  // Filter out skipped recommendations
  const visibleRecommendations = useMemo(
    () => recommendations.filter(r => !state.skipped.has(r.missionKey)),
    [recommendations, state.skipped]
  );

  const handleSkip = (missionKey: string) => {
    setState(prev => ({
      ...prev,
      skipped: new Set(prev.skipped).add(missionKey),
    }));
    onSkip?.(missionKey);
  };

  const handleComplete = (missionKey: string) => {
    onComplete?.(missionKey);
  };

  const toggleLearnMore = (missionKey: string) => {
    setState(prev => ({
      ...prev,
      expandedKey: prev.expandedKey === missionKey ? null : missionKey,
    }));
  };

  // Nothing to show
  if (visibleRecommendations.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900">Grow Your Community</h3>
        </div>
        <div className="p-8 text-center">
          <svg
            className="w-12 h-12 text-green-400 mx-auto mb-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-gray-500">
            Your community is fully set up! No recommendations at this time.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Check back later as new features become available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-gray-900">Grow Your Community</h3>
        <span className="text-xs text-gray-500">
          {visibleRecommendations.length} recommendation
          {visibleRecommendations.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Recommendation Cards */}
      {visibleRecommendations.map(rec => {
        const isExpanded = state.expandedKey === rec.missionKey;
        const priorityLabel =
          rec.priority <= 5 ? 'High Priority' : rec.priority <= 15 ? 'Recommended' : 'Optional';

        return (
          <div
            key={rec.missionKey}
            className="border border-gray-200 rounded-lg bg-white overflow-hidden"
            data-testid={`recommendation-${rec.missionKey}`}
          >
            {/* Card Header */}
            <div className="flex items-start justify-between px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900">{rec.title}</h4>
                  {rec.priority <= 5 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                      ⭐
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      rec.priority <= 5
                        ? 'bg-red-100 text-red-700'
                        : rec.priority <= 15
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {priorityLabel}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{rec.description}</p>
                <p className="text-xs text-gray-400 mt-1">Est. time: {rec.estimatedTime}</p>
              </div>
            </div>

            {/* Learn More Panel */}
            {isExpanded && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-1">Benefits</p>
                <ul className="space-y-1">
                  {rec.benefits.map((benefit, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleComplete(rec.missionKey)}
                className="flex-1 py-2 text-sm font-medium text-white bg-soralia-primary rounded-lg hover:bg-soralia-primary/90 transition-colors"
              >
                Complete
              </button>
              <button
                type="button"
                onClick={() => handleSkip(rec.missionKey)}
                className="py-2 px-3 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => toggleLearnMore(rec.missionKey)}
                className={`py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                  isExpanded
                    ? 'text-soralia-primary bg-soralia-primary/10'
                    : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Learn More
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
