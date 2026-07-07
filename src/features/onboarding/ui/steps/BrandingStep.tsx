'use client';

import { useState } from 'react';
import Image from 'next/image';
import { OnboardingStep } from '../OnboardingStep';
import type { OnboardingFormData } from '../../model/useOnboarding';

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

const FONT_OPTIONS = [
  { value: 'system', label: 'System Default' },
  { value: 'inter', label: 'Inter' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'lato', label: 'Lato' },
];

export function BrandingStep({
  loading,
  error,
  formData,
  setFormData,
  saveStep,
  onNext,
}: StepProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const success = await saveStep(1, { branding: formData.branding });
    setSaving(false);
    if (success) onNext();
  };

  return (
    <OnboardingStep
      title="Brand Your Community"
      description="Choose colors, fonts, and a logo to make your community site unique."
    >
      <div className="space-y-6">
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Community Logo</label>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
              {formData.branding.logoUrl ? (
                <Image
                  src={formData.branding.logoUrl}
                  alt="Logo"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-gray-400 text-xs text-center">No logo</span>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    alert('File must be under 2MB');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = ev => {
                    setFormData(prev => ({
                      ...prev,
                      branding: { ...prev.branding, logoUrl: ev.target?.result as string },
                    }));
                  };
                  reader.readAsDataURL(file);
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p className="mt-1 text-xs text-gray-500">PNG or JPEG, max 2MB</p>
            </div>
          </div>
        </div>

        {/* Primary Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={formData.branding.primaryColor}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  branding: { ...prev.branding, primaryColor: e.target.value },
                }))
              }
              className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={formData.branding.primaryColor}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  branding: { ...prev.branding, primaryColor: e.target.value },
                }))
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="#4F46E5"
            />
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Accent Color <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={formData.branding.accentColor || '#F59E0B'}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  branding: { ...prev.branding, accentColor: e.target.value },
                }))
              }
              className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={formData.branding.accentColor || ''}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  branding: { ...prev.branding, accentColor: e.target.value },
                }))
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="#F59E0B"
            />
          </div>
        </div>

        {/* Font Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
          <select
            value={formData.branding.fontFamily || 'system'}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                branding: { ...prev.branding, fontFamily: e.target.value },
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {FONT_OPTIONS.map(font => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save & Continue'}
        </button>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>
    </OnboardingStep>
  );
}
