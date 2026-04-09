'use client';

import { useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { createComponentLogger } from '@/lib/logging';

const log = createComponentLogger('PageSettingsWidget');

interface PageFlags {
  campaign: boolean;
  conservation: 'default' | 'managed' | 'external';
  conservationExternalUrl: string;
  chat: boolean;
  news: boolean;
  events: boolean;
  directory: boolean;
}

interface PageFlagsWidgetProps {
  initialFlags?: PageFlags;
}

export function PageSettingsWidget({ initialFlags }: PageFlagsWidgetProps) {
  const [flags, setFlags] = useState<PageFlags>(
    initialFlags || {
      campaign: true,
      conservation: 'default',
      conservationExternalUrl: '',
      chat: true,
      news: true,
      events: true,
      directory: true,
    }
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchFlags() {
      try {
        const res = await fetch('/api/admin/settings/page-flags');
        if (res.ok) {
          const data = await res.json();
          setFlags(prev => ({ ...prev, ...data }));
        }
      } catch (error) {
        log.error({}, 'Failed to fetch page flags', error);
      } finally {
        setLoading(false);
      }
    }
    fetchFlags();
  }, []);

  const updateFlag = async (key: keyof PageFlags, value: string | boolean) => {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/admin/settings/page-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });

      if (res.ok) {
        setFlags(prev => ({ ...prev, [key]: value }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      log.error({}, 'Failed to update flag', error);
    } finally {
      setSaving(false);
    }
  };

  const pageOptions = [
    {
      key: 'campaign' as const,
      label: 'Campaign Page',
      icon: 'fa-bullhorn',
      description: 'Show campaign page in navigation',
    },
    {
      key: 'directory' as const,
      label: 'Directory',
      icon: 'fa-users',
      description: 'Show resident directory',
    },
    {
      key: 'news' as const,
      label: 'News',
      icon: 'fa-newspaper',
      description: 'Show news & announcements',
    },
    {
      key: 'events' as const,
      label: 'Events',
      icon: 'fa-calendar',
      description: 'Show community events',
    },
    {
      key: 'chat' as const,
      label: 'Chat',
      icon: 'fa-comments',
      description: 'Enable community chat',
    },
  ];

  const conservationModes = [
    {
      value: 'default',
      label: 'Default Content',
      description: 'Built-in Soralia conservation content',
    },
    { value: 'managed', label: 'Managed Content', description: 'Content managed via CMS' },
    {
      value: 'external',
      label: 'External Portal',
      description: 'Link to external conservation portal',
    },
  ];

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Page Visibility</h3>
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <i className="fas fa-check-circle"></i> Saved
            </span>
          )}
        </div>

        {/* Page Toggles */}
        <div className="space-y-3">
          {pageOptions.map(option => (
            <div
              key={option.key}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center`}
                >
                  <i className={`fas ${option.icon} text-indigo-600`}></i>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{option.label}</p>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
              </div>
              <button
                onClick={() => updateFlag(option.key, !flags[option.key])}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  flags[option.key] ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    flags[option.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Conservation Mode */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <i className="fas fa-leaf text-green-600"></i>
            Conservation Page Mode
          </h4>
          <div className="space-y-2">
            {conservationModes.map(mode => (
              <label
                key={mode.value}
                className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all ${
                  flags.conservation === mode.value
                    ? 'bg-green-50 border-2 border-green-500'
                    : 'bg-slate-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="conservation"
                    value={mode.value}
                    checked={flags.conservation === mode.value}
                    onChange={() => updateFlag('conservation', mode.value)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{mode.label}</p>
                    <p className="text-sm text-gray-500">{mode.description}</p>
                  </div>
                </div>
                {flags.conservation === mode.value && (
                  <i className="fas fa-check-circle text-green-600 text-lg"></i>
                )}
              </label>
            ))}
          </div>

          {/* External URL Input */}
          {flags.conservation === 'external' && (
            <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                External Portal URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={flags.conservationExternalUrl}
                  onChange={e =>
                    setFlags(prev => ({ ...prev, conservationExternalUrl: e.target.value }))
                  }
                  placeholder="https://capenature.example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={() =>
                    updateFlag('conservationExternalUrl', flags.conservationExternalUrl)
                  }
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  Save URL
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Enter the URL of the external conservation portal to display in an iframe.
              </p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
