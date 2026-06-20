'use client';

import { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { useSafeTranslation } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';
import { Plus, Trash2 } from 'lucide-react';
import { PRESET_FACILITIES } from '@entities/booking';
import type { TenantFacility } from '@entities/booking';

const log = createComponentLogger('admin-bookings');

export default function AdminBookingsPage() {
  const { tx } = useSafeTranslation(['common', 'admin']);
  const [facilities, setFacilities] = useState<TenantFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState('');
  const [customLabel, setCustomLabel] = useState('');

  useEffect(() => {
    fetch('/api/admin/bookings')
      .then(r => r.json())
      .then(body => {
        const data = body?.data ?? [];
        setFacilities(data);
      })
      .catch(err => {
        log.error({}, 'Failed to load booking facilities', err);
        setError('Failed to load configuration');
      })
      .finally(() => setLoading(false));
  }, []);

  const isEnabled = useCallback(
    (value: string) => facilities.some(f => f.value === value),
    [facilities]
  );

  const togglePreset = useCallback((preset: TenantFacility) => {
    setFacilities(prev => {
      if (prev.some(f => f.value === preset.value)) {
        return prev.filter(f => f.value !== preset.value);
      }
      return [...prev, preset];
    });
  }, []);

  const addCustom = useCallback(() => {
    const val = customValue.trim().toUpperCase().replace(/\s+/g, '_');
    const lbl = customLabel.trim();
    if (!val || !lbl) return;
    if (facilities.some(f => f.value === val)) return;
    setFacilities(prev => [...prev, { value: val, label: lbl }]);
    setCustomValue('');
    setCustomLabel('');
  }, [customValue, customLabel, facilities]);

  const removeCustom = useCallback((value: string) => {
    setFacilities(prev => prev.filter(f => f.value !== value));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facilities),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }, [facilities]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { label: tx('nav.home', 'Home'), href: '/' },
              { label: tx('nav.admin', 'Admin'), href: '/admin' },
              { label: 'Bookings' },
            ]}
          />

          <div className="flex items-center justify-between mt-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
              <p className="text-sm text-gray-500 mt-1">
                Set which facilities are available for residents to book.
              </p>
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-6">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}

          {/* Preset Facilities */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Facility Catalog</h2>
            <p className="text-sm text-gray-500 mb-4">
              Toggle facilities on or off to control what residents can book.
            </p>
            <div className="space-y-3">
              {PRESET_FACILITIES.map(preset => (
                <div
                  key={preset.value}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div>
                    <span className="font-medium text-gray-900">{preset.label}</span>
                    <span className="ml-2 text-xs text-gray-400 uppercase">{preset.value}</span>
                  </div>
                  <button
                    onClick={() => togglePreset(preset)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isEnabled(preset.value) ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEnabled(preset.value) ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Custom Facilities */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom Facilities</h2>
            <p className="text-sm text-gray-500 mb-4">Add facilities not in the catalog above.</p>

            <div className="flex gap-3 mb-4">
              <input
                value={customValue}
                onChange={e => setCustomValue(e.target.value)}
                placeholder="Code (e.g. BOWLING)"
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <input
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
                placeholder="Label (e.g. Bowling Alley)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={addCustom}
                disabled={!customValue.trim() || !customLabel.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {facilities
              .filter(f => !PRESET_FACILITIES.some(p => p.value === f.value))
              .map(f => (
                <div
                  key={f.value}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-2"
                >
                  <div>
                    <span className="font-medium text-gray-900">{f.label}</span>
                    <span className="ml-2 text-xs text-gray-400 uppercase">{f.value}</span>
                  </div>
                  <button
                    onClick={() => removeCustom(f.value)}
                    className="text-red-400 hover:text-red-600 transition p-1"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

            {facilities.filter(f => !PRESET_FACILITIES.some(p => p.value === f.value)).length ===
              0 && (
              <p className="text-sm text-gray-400 text-center py-4">No custom facilities added.</p>
            )}
          </section>

          {/* Bottom save */}
          <div className="flex justify-end mt-8">
            <button
              onClick={save}
              disabled={saving}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 shadow-lg"
            >
              {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
