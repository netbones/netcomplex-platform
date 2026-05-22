'use client';

import { useState } from 'react';
import { OnboardingStep } from '../OnboardingStep';
import type { OnboardingFormData } from '../../model/useOnboarding';
import { PRESET_FACILITIES, DEFAULT_FACILITIES } from '@entities/booking';
import type { TenantFacility } from '@entities/booking';

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

export function FacilitiesStep({
  loading,
  error,
  formData,
  setFormData,
  saveStep,
  onNext,
  onSkip,
}: StepProps) {
  const [saving, setSaving] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Initialize with defaults if not set
  const selectedFacilities: TenantFacility[] =
    formData.facilities?.length > 0 ? formData.facilities : DEFAULT_FACILITIES;

  const isSelected = (value: string) => selectedFacilities.some(f => f.value === value);

  const togglePreset = (facility: TenantFacility) => {
    const currentlySelected = isSelected(facility.value);
    const updated = currentlySelected
      ? selectedFacilities.filter(f => f.value !== facility.value)
      : [...selectedFacilities, facility];

    setFormData(prev => ({ ...prev, facilities: updated }));
  };

  const addCustomFacility = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    const value = trimmed.toLowerCase().replace(/\s+/g, '_');
    if (isSelected(value)) {
      setCustomInput('');
      return;
    }

    const customFacility: TenantFacility = { value, label: trimmed };
    setFormData(prev => ({
      ...prev,
      facilities: [...prev.facilities, customFacility],
    }));
    setCustomInput('');
  };

  const removeCustomFacility = (value: string) => {
    // Only allow removing custom facilities (not presets)
    const isPreset = PRESET_FACILITIES.some(p => p.value === value);
    if (isPreset) return;

    setFormData(prev => ({
      ...prev,
      facilities: prev.facilities.filter(f => f.value !== value),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await saveStep(3, {
      facilities: selectedFacilities,
      booking_facilities: JSON.stringify(selectedFacilities),
    });
    setSaving(false);
    if (success) onNext();
  };

  return (
    <OnboardingStep
      title="Configure Your Facilities"
      description="Select the bookable facilities your community offers. You can add custom facilities too."
    >
      <div className="space-y-4">
        {/* Preset Facilities */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Available Facilities
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_FACILITIES.map(facility => {
              const selected = isSelected(facility.value);
              return (
                <label
                  key={facility.value}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selected
                      ? 'bg-indigo-50 border-2 border-indigo-300'
                      : 'bg-slate-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => togglePreset(facility)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span
                    className={`text-sm font-medium ${
                      selected ? 'text-indigo-900' : 'text-gray-700'
                    }`}
                  >
                    {facility.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Custom Facilities */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Custom Facilities
          </h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomFacility())}
              placeholder="e.g., Workshop, Bike Storage"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={addCustomFacility}
              disabled={!customInput.trim()}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Show custom (non-preset) facilities */}
          {selectedFacilities
            .filter(f => !PRESET_FACILITIES.some(p => p.value === f.value))
            .map(facility => (
              <div
                key={facility.value}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <span className="text-sm font-medium text-green-900">{facility.label}</span>
                <button
                  onClick={() => removeCustomFacility(facility.value)}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
        </div>

        {/* Selected count */}
        <p className="text-sm text-gray-500 text-center">
          {selectedFacilities.length} facilit{selectedFacilities.length === 1 ? 'y' : 'ies'}{' '}
          selected
        </p>

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
            disabled={saving || loading || selectedFacilities.length === 0}
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
