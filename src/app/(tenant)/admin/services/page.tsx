'use client';

import { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { useSafeTranslation } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';
import { Loader2, PlusCircle, X } from 'lucide-react';
import type {
  ServicesPageConfig,
  CategoryConfig,
  EmergencyContactConfig,
  HourConfig,
  AdditionalServiceConfig,
} from '@entities/tenant';

const log = createComponentLogger('admin-services');

type SectionKey =
  | 'heroVisible'
  | 'categoriesVisible'
  | 'emergencyVisible'
  | 'hoursVisible'
  | 'additionalVisible'
  | 'directoryCtaVisible';

const SECTION_LABELS: Record<SectionKey, string> = {
  heroVisible: 'Hero Section',
  categoriesVisible: 'Service Categories',
  emergencyVisible: 'Emergency Contacts',
  hoursVisible: 'Service Hours',
  additionalVisible: 'Additional Services',
  directoryCtaVisible: 'Directory CTA',
};

const TOGGLE_ORDER: SectionKey[] = [
  'heroVisible',
  'categoriesVisible',
  'emergencyVisible',
  'hoursVisible',
  'additionalVisible',
  'directoryCtaVisible',
];

export default function AdminServicesPage() {
  const { tx } = useSafeTranslation(['common', 'admin']);
  const [config, setConfig] = useState<ServicesPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/services-config')
      .then(r => r.json())
      .then(body => {
        const data = body?.data ?? body;
        setConfig(data);
      })
      .catch(err => {
        log.error({}, 'Failed to load config', err);
        setError('Failed to load configuration');
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleSection = useCallback((key: SectionKey) => {
    setConfig(prev => (prev ? { ...prev, [key]: !prev[key] } : prev));
  }, []);

  const save = useCallback(async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/admin/services-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
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
  }, [config]);

  const updateCategories = useCallback((cats: CategoryConfig[]) => {
    setConfig(prev => (prev ? { ...prev, categories: cats } : prev));
  }, []);

  const updateEmergency = useCallback((contacts: EmergencyContactConfig[]) => {
    setConfig(prev => (prev ? { ...prev, emergencyContacts: contacts } : prev));
  }, []);

  const updateHours = useCallback((items: HourConfig[]) => {
    setConfig(prev => (prev ? { ...prev, hours: items } : prev));
  }, []);

  const updateAdditional = useCallback((items: AdditionalServiceConfig[]) => {
    setConfig(prev => (prev ? { ...prev, additionalServices: items } : prev));
  }, []);

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

  if (!config) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500">
        Failed to load configuration.
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
              { label: 'Services Page' },
            ]}
          />

          <div className="flex items-center justify-between mt-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Services Page</h1>
              <p className="text-sm text-gray-500 mt-1">
                Configure which sections appear on the public services page and their content.
              </p>
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 />}
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

          {/* Section Visibility Toggles */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Section Visibility</h2>
            <p className="text-sm text-gray-500 mb-4">
              Toggle sections on or off on the public services page.
            </p>
            <div className="space-y-3">
              {TOGGLE_ORDER.map(key => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <span className="font-medium text-gray-900">{SECTION_LABELS[key]}</span>
                  <button
                    onClick={() => toggleSection(key)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config[key] ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config[key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Categories Editor */}
          {config.categoriesVisible && (
            <ConfigSection title="Service Categories">
              <EditableList
                items={config.categories}
                renderItem={(cat, i) => (
                  <div className="flex-1 space-y-2">
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      value={cat.title}
                      onChange={e => {
                        const next = [...config.categories];
                        next[i] = { ...next[i], title: e.target.value };
                        updateCategories(next);
                      }}
                    />
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-500"
                      value={cat.subtitle}
                      onChange={e => {
                        const next = [...config.categories];
                        next[i] = { ...next[i], subtitle: e.target.value };
                        updateCategories(next);
                      }}
                    />
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      rows={2}
                      value={cat.items.join('\n')}
                      onChange={e => {
                        const next = [...config.categories];
                        next[i] = { ...next[i], items: e.target.value.split('\n').filter(Boolean) };
                        updateCategories(next);
                      }}
                      placeholder="One item per line"
                    />
                  </div>
                )}
                onRemove={i => updateCategories(config.categories.filter((_, idx) => idx !== i))}
                onAdd={() =>
                  updateCategories([
                    ...config.categories,
                    {
                      id: `cat-${Date.now()}`,
                      title: '',
                      subtitle: '',
                      icon: 'fa-concierge-bell',
                      items: [''],
                    },
                  ])
                }
              />
            </ConfigSection>
          )}

          {/* Emergency Contacts Editor */}
          {config.emergencyVisible && (
            <ConfigSection title="Emergency Contacts">
              <EditableList
                items={config.emergencyContacts}
                renderItem={(contact, i) => (
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      value={contact.label}
                      onChange={e => {
                        const next = [...config.emergencyContacts];
                        next[i] = { ...next[i], label: e.target.value };
                        updateEmergency(next);
                      }}
                      placeholder="Label"
                    />
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      value={contact.phone}
                      onChange={e => {
                        const next = [...config.emergencyContacts];
                        next[i] = { ...next[i], phone: e.target.value };
                        updateEmergency(next);
                      }}
                      placeholder="Phone number"
                    />
                  </div>
                )}
                onRemove={i =>
                  updateEmergency(config.emergencyContacts.filter((_, idx) => idx !== i))
                }
                onAdd={() =>
                  updateEmergency([...config.emergencyContacts, { label: '', phone: '' }])
                }
              />
            </ConfigSection>
          )}

          {/* Service Hours Editor */}
          {config.hoursVisible && (
            <ConfigSection title="Service Hours">
              <EditableList
                items={config.hours}
                renderItem={(h, i) => (
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      value={h.service}
                      onChange={e => {
                        const next = [...config.hours];
                        next[i] = { ...next[i], service: e.target.value };
                        updateHours(next);
                      }}
                      placeholder="Service name"
                    />
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      value={h.hours}
                      onChange={e => {
                        const next = [...config.hours];
                        next[i] = { ...next[i], hours: e.target.value };
                        updateHours(next);
                      }}
                      placeholder="Hours"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={h.highlight}
                        onChange={e => {
                          const next = [...config.hours];
                          next[i] = { ...next[i], highlight: e.target.checked };
                          updateHours(next);
                        }}
                        className="rounded"
                      />
                      24/7 Highlight
                    </label>
                  </div>
                )}
                onRemove={i => updateHours(config.hours.filter((_, idx) => idx !== i))}
                onAdd={() =>
                  updateHours([...config.hours, { service: '', hours: '', highlight: false }])
                }
              />
            </ConfigSection>
          )}

          {/* Additional Services Editor */}
          {config.additionalVisible && (
            <ConfigSection title="Additional Services">
              <EditableList
                items={config.additionalServices}
                renderItem={(s, i) => (
                  <div className="flex-1 space-y-2">
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      value={s.title}
                      onChange={e => {
                        const next = [...config.additionalServices];
                        next[i] = { ...next[i], title: e.target.value };
                        updateAdditional(next);
                      }}
                      placeholder="Title"
                    />
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                      rows={2}
                      value={s.desc}
                      onChange={e => {
                        const next = [...config.additionalServices];
                        next[i] = { ...next[i], desc: e.target.value };
                        updateAdditional(next);
                      }}
                      placeholder="Description"
                    />
                  </div>
                )}
                onRemove={i =>
                  updateAdditional(config.additionalServices.filter((_, idx) => idx !== i))
                }
                onAdd={() =>
                  updateAdditional([
                    ...config.additionalServices,
                    { id: `add-${Date.now()}`, icon: 'fa-plus-circle', title: '', desc: '' },
                  ])
                }
              />
            </ConfigSection>
          )}

          {/* Bottom save */}
          <div className="flex justify-end mt-8">
            <button
              onClick={save}
              disabled={saving}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 shadow-lg"
            >
              {saving && <Loader2 />}
              {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function EditableList<T>({
  items,
  renderItem,
  onRemove,
  onAdd,
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
          {renderItem(item, i)}
          <button
            onClick={() => onRemove(i)}
            className="text-red-400 hover:text-red-600 transition mt-1.5 p-1"
            title="Remove"
          >
            <X />
          </button>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
      >
        <PlusCircle className="w-4 h-4" /> Add Item
      </button>
    </div>
  );
}
