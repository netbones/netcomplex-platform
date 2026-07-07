'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAutoSaveSetting } from '../model/useAutoSaveSetting';

interface ContextualPrompt {
  key: string;
  title: string;
  message: string;
  configUrl?: string;
}

interface ContextualPromptsProps {
  tenantId: string;
  /** Map of module key → enabled state */
  enabledModules: Record<string, boolean>;
  /** Map of module key → is-configured state */
  configuredModules: Record<string, boolean>;
}

/**
 * Contextual progressive-disclosure prompts.
 *
 * When a user enables a module that has sub-configuration, this component
 * shows a banner prompting them to complete the setup. Dismissed prompts
 * are persisted via SetupSetting per module key so they don't re-appear.
 */
export default function ContextualPrompts({
  tenantId,
  enabledModules,
  configuredModules,
}: ContextualPromptsProps) {
  const { saveSetting } = useAutoSaveSetting(tenantId);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [visiblePrompts, setVisiblePrompts] = useState<ContextualPrompt[]>([]);

  // Prompt definitions — one per configurable module
  const promptDefinitions: Record<string, ContextualPrompt> = {
    maintenance: {
      key: 'maintenance',
      title: 'Configure Maintenance',
      message:
        'Maintenance is now enabled. Set up categories, teams, and providers to get started.',
      configUrl: '/admin/maintenance',
    },
    bookings: {
      key: 'bookings',
      title: 'Set Up Bookings',
      message:
        'Bookings is now enabled. Configure facilities, time slots, and pricing to get started.',
      configUrl: '/admin/bookings',
    },
    dwallet: {
      key: 'dwallet',
      title: 'Configure dWallet',
      message:
        'dWallet is now enabled. Set up data revenue streams and community value distribution.',
      configUrl: '/admin/dwallet',
    },
    surveys: {
      key: 'surveys',
      title: 'Create Your First Survey',
      message: 'Surveys are now enabled. Create a poll or feedback form to engage residents.',
      configUrl: '/admin/surveys',
    },
    competitions: {
      key: 'competitions',
      title: 'Set Up Competitions',
      message:
        'Competitions are now enabled. Create your first competition to engage the community.',
      configUrl: '/admin/competitions',
    },
    achievements: {
      key: 'achievements',
      title: 'Configure Achievements',
      message: 'Achievements are now enabled. Set up recognition badges and reward tiers.',
      configUrl: '/admin/achievements',
    },
    marketplace: {
      key: 'marketplace',
      title: 'Open the Marketplace',
      message:
        'Marketplace is now enabled. Configure categories and let residents offer local services.',
      configUrl: '/admin/marketplace',
    },
  };

  // Determine which prompts should show
  useEffect(() => {
    const prompts: ContextualPrompt[] = [];

    for (const modKey of Object.keys(promptDefinitions)) {
      const isEnabled = enabledModules[modKey] === true;
      const isConfigured = configuredModules[modKey] === true;
      const isDismissed = dismissedKeys.has(modKey);

      // Show prompt if: module is enabled AND module is NOT yet configured AND not dismissed
      if (isEnabled && !isConfigured && !isDismissed) {
        prompts.push(promptDefinitions[modKey]);
      }
    }

    setVisiblePrompts(prompts);
  }, [enabledModules, configuredModules, dismissedKeys]);

  const handleDismiss = useCallback(
    (key: string) => {
      setDismissedKeys(prev => new Set(prev).add(key));
      // Persist the dismissal so it survives a page reload
      saveSetting(`configure.prompts.${key}.dismissed`, true);
    },
    [saveSetting]
  );

  if (visiblePrompts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2" data-testid="contextual-prompts">
      {visiblePrompts.map(prompt => (
        <div
          key={prompt.key}
          className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
          data-testid={`prompt-${prompt.key}`}
        >
          <span className="text-blue-500 text-base flex-shrink-0 mt-0.5">💡</span>
          <div className="flex-1 min-w-0">
            <h5 className="text-sm font-semibold text-blue-800">{prompt.title}</h5>
            <p className="text-sm text-blue-700 mt-0.5">{prompt.message}</p>
            <div className="flex gap-2 mt-2">
              {prompt.configUrl && (
                <a
                  href={prompt.configUrl}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-soralia-primary rounded-lg hover:bg-soralia-primary/90 transition-colors"
                >
                  Configure
                </a>
              )}
              <button
                type="button"
                onClick={() => handleDismiss(prompt.key)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
