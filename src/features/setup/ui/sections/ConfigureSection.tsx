'use client';

import { useState, useEffect } from 'react';
import type { TierLevel, ModuleKey } from '@entities/tenant';
import { hasModuleAccess, MODULES } from '@entities/tenant';
import { useAutoSaveSetting } from '../../model/useAutoSaveSetting';

interface ConfigureSectionProps {
  tenantId: string;
  tier: TierLevel;
}

interface ConfigureModule {
  key: string;
  label: string;
  description: string;
  moduleKey?: ModuleKey;
  minTier: TierLevel;
  /** Sub-configuration setting key that must be present for module to be considered "configured" */
  settingKey?: string;
  /** URL to navigate for sub-configuration */
  configUrl?: string;
}

const CONFIGURE_MODULES: ConfigureModule[] = [
  {
    key: 'maintenance',
    label: 'Maintenance',
    description: 'Maintenance request tracking and category configuration.',
    moduleKey: 'maintenance',
    minTier: 'core',
    settingKey: 'configure.maintenance.categories',
    configUrl: '/admin/maintenance',
  },
  {
    key: 'bookings',
    label: 'Bookings',
    description: 'Facility booking system with time slots and pricing.',
    moduleKey: 'bookings',
    minTier: 'depth',
    settingKey: 'configure.bookings.facilities',
    configUrl: '/admin/bookings',
  },
  {
    key: 'dwallet',
    label: 'dWallet',
    description: 'Data-sharing revenue and community value distribution.',
    minTier: 'depth',
    settingKey: 'configure.wallet',
    configUrl: '/admin/dwallet',
  },
  {
    key: 'surveys',
    label: 'Surveys',
    description: 'Community polls and resident feedback collection.',
    moduleKey: 'surveys',
    minTier: 'depth',
    settingKey: 'configure.surveys',
    configUrl: '/admin/surveys',
  },
  {
    key: 'competitions',
    label: 'Competitions',
    description: 'Community competitions and leaderboards.',
    minTier: 'depth',
    settingKey: 'configure.competitions',
    configUrl: '/admin/competitions',
  },
  {
    key: 'achievements',
    label: 'Achievements',
    description: 'Community achievement system and recognition badges.',
    minTier: 'depth',
    settingKey: 'configure.achievements',
    configUrl: '/admin/achievements',
  },
  {
    key: 'marketplace',
    label: 'Services / Marketplace',
    description: 'Let residents offer and find local services.',
    moduleKey: 'marketplace',
    minTier: 'depth',
    settingKey: 'configure.marketplace',
    configUrl: '/admin/marketplace',
  },
];

const TIER_ORDER: Record<TierLevel, number> = {
  foundation: 0,
  depth: 1,
  core: 2,
};

function canAccessModuleTier(tier: TierLevel, minTier: TierLevel): boolean {
  return TIER_ORDER[tier] >= TIER_ORDER[minTier];
}

function MissionCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      <div className="px-4 py-3" data-testid={`mission-${id}`}>
        {children}
      </div>
    </div>
  );
}

interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description: string;
  showConfig: boolean;
  configUrl?: string;
  configLabel?: string;
}

function ModuleToggle({
  enabled,
  onToggle,
  label,
  description,
  showConfig,
  configUrl,
  configLabel,
}: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {enabled && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
              Enabled
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        {enabled && showConfig && configUrl && (
          <a
            href={configUrl}
            className="inline-flex items-center gap-1 mt-1 text-xs text-soralia-primary hover:text-soralia-primary/80 font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {configLabel || 'Configure'}
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ml-4 ${
          enabled ? 'bg-soralia-primary' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={enabled}
        aria-label={`Toggle ${label}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function ConfigureSection({ tenantId, tier }: ConfigureSectionProps) {
  const { saveSetting, isSaving, error } = useAutoSaveSetting(tenantId);
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});

  // Determine which modules are visible based on tier
  const visibleModules = CONFIGURE_MODULES.filter(mod => canAccessModuleTier(tier, mod.minTier));

  // Initialize enabled state from what tier already allows
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const mod of visibleModules) {
      if (mod.moduleKey) {
        initial[mod.key] = hasModuleAccess(tier, mod.moduleKey);
      } else {
        // Non-standard modules default disabled; enabled only if tier allows
        initial[mod.key] = canAccessModuleTier(tier, mod.minTier);
      }
    }
    setEnabledModules(initial);
  }, [tier]);

  const handleToggle = (modKey: string, newEnabled: boolean) => {
    setEnabledModules(prev => ({ ...prev, [modKey]: newEnabled }));
    saveSetting(`configure.modules.${modKey}.enabled`, newEnabled);
  };

  // Count enabled vs total
  const enabledCount =
    visibleModules.length > 0 ? visibleModules.filter(m => enabledModules[m.key]).length : 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-gray-900">Configure Modules</h3>
        <span className="text-xs text-gray-500">
          {enabledCount}/{visibleModules.length} enabled
        </span>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {isSaving && <div className="text-xs text-amber-500 animate-pulse">Saving changes…</div>}

      {/* Available Modules */}
      <MissionCard
        id="configure-modules"
        title="Available Modules"
        description="Enable or disable optional platform features."
      >
        <div className="divide-y divide-gray-100">
          {visibleModules.map(mod => {
            const enabled = enabledModules[mod.key] ?? false;
            const modDef = mod.moduleKey ? MODULES[mod.moduleKey] : null;

            return (
              <ModuleToggle
                key={mod.key}
                enabled={enabled}
                onToggle={() => handleToggle(mod.key, !enabled)}
                label={mod.label}
                description={mod.description}
                showConfig={enabled}
                configUrl={mod.configUrl}
                configLabel={modDef?.label ? `Configure ${modDef.label}` : `Configure ${mod.label}`}
              />
            );
          })}
        </div>
      </MissionCard>

      {/* Tier Information */}
      {tier === 'foundation' && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 text-lg flex-shrink-0">⚡</span>
            <div>
              <h4 className="text-sm font-semibold text-amber-800">Upgrade for More Modules</h4>
              <p className="text-sm text-amber-700 mt-1">
                Your Foundation tier includes core community features. Upgrade to Depth or Core to
                unlock maintenance tracking, bookings, surveys, marketplace, and more.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
