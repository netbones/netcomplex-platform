'use client';

import { useState, useEffect } from 'react';
import { OnboardingStep } from '../OnboardingStep';
import type { OnboardingFormData } from '../../model/useOnboarding';
import { MODULES, type ModuleKey, hasModuleAccess } from '@shared/lib';

interface StepProps {
  loading: boolean;
  error: string;
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  saveStep: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7, data: Record<string, unknown>) => Promise<boolean>;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete?: () => void;
  tenantId: string;
}

const PREMIUM_MODULES: ModuleKey[] = ['bookings', 'marketplace', 'surveys', 'externalSurveys'];

export function ModulesStep({
  loading,
  error,
  formData,
  setFormData,
  saveStep,
  onNext,
  onSkip,
}: StepProps) {
  const [saving, setSaving] = useState(false);

  // Initialize modules with all foundation tier modules enabled
  useEffect(() => {
    if (Object.keys(formData.modules).length === 0) {
      const initialModules: Record<string, boolean> = {};
      (Object.keys(MODULES) as ModuleKey[]).forEach(key => {
        initialModules[key] = hasModuleAccess('core', key);
      });
      setFormData(prev => ({ ...prev, modules: initialModules }));
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const success = await saveStep(2, { modules: formData.modules });
    setSaving(false);
    if (success) onNext();
  };

  const foundationModules = (Object.keys(MODULES) as ModuleKey[]).filter(key =>
    hasModuleAccess('core', key)
  );

  const premiumModules = PREMIUM_MODULES.filter(key => !hasModuleAccess('core', key));

  return (
    <OnboardingStep
      title="Choose Your Modules"
      description="Select the features you want enabled for your community. You can change these later."
    >
      <div className="space-y-4">
        {/* Available Modules */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Available Modules
          </h4>
          {foundationModules.map(key => {
            const module = MODULES[key];
            const enabled = formData.modules[key] ?? true;
            return (
              <div
                key={key}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{module.label}</p>
                  <p className="text-sm text-gray-500">{module.description}</p>
                </div>
                <button
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      modules: { ...prev.modules, [key]: !prev.modules[key] },
                    }))
                  }
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
        </div>

        {/* Premium Upsell */}
        {premiumModules.length > 0 && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-amber-500 text-lg">⚡</span>
              <div>
                <h4 className="text-sm font-semibold text-amber-800">Upgrade for More Features</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Unlock {premiumModules.length} additional modules with a higher tier:
                </p>
                <ul className="mt-2 space-y-1">
                  {premiumModules.map(key => (
                    <li key={key} className="text-sm text-amber-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                      {MODULES[key]?.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps Teaser */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            You'll configure your facilities and maintenance categories in the next steps.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onSkip}
            disabled={loading}
            className="flex-1 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>
    </OnboardingStep>
  );
}
