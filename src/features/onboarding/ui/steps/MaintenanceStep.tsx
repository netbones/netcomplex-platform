'use client';

import { useState } from 'react';
import { OnboardingStep } from '../OnboardingStep';
import type { OnboardingFormData } from '../../model/useOnboarding';
import { PRESET_CATEGORIES, DEFAULT_CATEGORIES } from '@entities/maintenance';
import type { TenantCategory } from '@entities/maintenance';

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

export function MaintenanceStep({
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
  const selectedCategories: TenantCategory[] =
    formData.maintenanceCategories?.length > 0
      ? formData.maintenanceCategories
      : DEFAULT_CATEGORIES;

  const isSelected = (value: string) => selectedCategories.some(c => c.value === value);

  const togglePreset = (category: TenantCategory) => {
    const currentlySelected = isSelected(category.value);
    const updated = currentlySelected
      ? selectedCategories.filter(c => c.value !== category.value)
      : [...selectedCategories, category];

    setFormData(prev => ({ ...prev, maintenanceCategories: updated }));
  };

  const addCustomCategory = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    const value = trimmed.toLowerCase().replace(/\s+/g, '_');
    if (isSelected(value)) {
      setCustomInput('');
      return;
    }

    const customCategory: TenantCategory = { value, label: trimmed };
    setFormData(prev => ({
      ...prev,
      maintenanceCategories: [...prev.maintenanceCategories, customCategory],
    }));
    setCustomInput('');
  };

  const removeCustomCategory = (value: string) => {
    // Only allow removing custom categories (not presets)
    const isPreset = PRESET_CATEGORIES.some(p => p.value === value);
    if (isPreset) return;

    setFormData(prev => ({
      ...prev,
      maintenanceCategories: prev.maintenanceCategories.filter(c => c.value !== value),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await saveStep(4, {
      maintenanceCategories: selectedCategories,
      maintenance_categories: JSON.stringify(selectedCategories),
    });
    setSaving(false);
    if (success) onNext();
  };

  return (
    <OnboardingStep
      title="Maintenance Categories"
      description="Select the maintenance request categories for your community. Residents will use these when submitting requests."
    >
      <div className="space-y-4">
        {/* Preset Categories */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Available Categories
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_CATEGORIES.map(category => {
              const selected = isSelected(category.value);
              return (
                <label
                  key={category.value}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selected
                      ? 'bg-indigo-50 border-2 border-indigo-300'
                      : 'bg-slate-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => togglePreset(category)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span
                    className={`text-sm font-medium ${
                      selected ? 'text-indigo-900' : 'text-gray-700'
                    }`}
                  >
                    {category.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Custom Categories */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Custom Categories
          </h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomCategory())}
              placeholder="e.g., Water Emergency, Gate Access"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={addCustomCategory}
              disabled={!customInput.trim()}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Show custom (non-preset) categories */}
          {selectedCategories
            .filter(c => !PRESET_CATEGORIES.some(p => p.value === c.value))
            .map(category => (
              <div
                key={category.value}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <span className="text-sm font-medium text-green-900">{category.label}</span>
                <button
                  onClick={() => removeCustomCategory(category.value)}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
        </div>

        {/* Selected count */}
        <p className="text-sm text-gray-500 text-center">
          {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'}{' '}
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
            disabled={saving || loading || selectedCategories.length === 0}
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
