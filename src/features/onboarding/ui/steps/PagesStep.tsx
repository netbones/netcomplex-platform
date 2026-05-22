'use client';

import { useState } from 'react';
import { OnboardingStep } from '../OnboardingStep';
import type { OnboardingFormData } from '../../model/useOnboarding';

interface PageOption {
  key: string;
  label: string;
  icon: string;
  description: string;
  defaultOn: boolean;
}

interface StepProps {
  loading: boolean;
  error: string;
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  saveStep: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7, data: Record<string, unknown>) => Promise<boolean>;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  onComplete?: () => void;
  tenantId: string;
}

const PAGE_OPTIONS: PageOption[] = [
  {
    key: 'news',
    label: 'News',
    icon: 'fa-newspaper',
    description: 'Community news & announcements',
    defaultOn: true,
  },
  {
    key: 'directory',
    label: 'Directory',
    icon: 'fa-users',
    description: 'Resident directory',
    defaultOn: true,
  },
  {
    key: 'events',
    label: 'Events',
    icon: 'fa-calendar',
    description: 'Community events calendar',
    defaultOn: true,
  },
  {
    key: 'campaign',
    label: 'Campaign',
    icon: 'fa-bullhorn',
    description: 'Active campaign page',
    defaultOn: true,
  },
  {
    key: 'chat',
    label: 'Chat',
    icon: 'fa-comments',
    description: 'Community chat',
    defaultOn: false,
  },
];

export function PagesStep({ loading, error, formData, setFormData, saveStep, onNext }: StepProps) {
  const [saving, setSaving] = useState(false);

  const pages = formData.pages;
  const getFlag = (key: string) => {
    if (key in pages) return pages[key];
    const option = PAGE_OPTIONS.find(o => o.key === key);
    return option?.defaultOn ?? true;
  };

  const togglePage = (key: string) => {
    setFormData(prev => ({
      ...prev,
      pages: { ...prev.pages, [key]: !getFlag(key) },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await saveStep(5, { pages: formData.pages });
    setSaving(false);
    if (success) onNext();
  };

  return (
    <OnboardingStep
      title="Page Visibility"
      description="Choose which pages appear in your community navigation. You can change these anytime."
    >
      <div className="space-y-3">
        {PAGE_OPTIONS.map(option => {
          const enabled = getFlag(option.key);
          return (
            <div
              key={option.key}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <i className={`fas ${option.icon} text-indigo-600`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{option.label}</p>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
              </div>
              <button
                onClick={() => togglePage(option.key)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          );
        })}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full mt-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>
    </OnboardingStep>
  );
}
