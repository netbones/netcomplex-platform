'use client';

import { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { useSafeTranslation } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';
import type { HeroCarouselConfig, CarouselItem } from '@entities/tenant';

const log = createComponentLogger('admin-carousel');

function newItem(): CarouselItem {
  return {
    id: crypto.randomUUID(),
    image: '',
    title: '',
    subtitle: '',
    link: '',
  };
}

export default function AdminCarouselPage() {
  const { tx } = useSafeTranslation(['common', 'admin']);
  const [config, setConfig] = useState<HeroCarouselConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings/hero-carousel')
      .then(r => r.json())
      .then(body => {
        const data = body?.data ?? body;
        setConfig(data);
      })
      .catch(err => {
        log.error({}, 'Failed to load carousel config', err);
        setError('Failed to load configuration');
      })
      .finally(() => setLoading(false));
  }, []);

  const updateItem = useCallback((id: string, field: keyof CarouselItem, value: string) => {
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item => (item.id === id ? { ...item, [field]: value } : item)),
      };
    });
  }, []);

  const addItem = useCallback(() => {
    setConfig(prev => {
      if (!prev) return prev;
      return { ...prev, items: [...prev.items, newItem()] };
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setConfig(prev => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter(item => item.id !== id) };
    });
  }, []);

  const save = useCallback(async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings/hero-carousel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const body = await res.json();
        setError(body?.message ?? body?.error ?? 'Failed to save');
      }
    } catch (err) {
      log.error({}, 'Failed to save carousel config', err);
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }, [config]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[{ label: tx('admin.dashboard'), href: '/admin' }, { label: 'Carousel' }]}
        />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-soralia-dark">Home Page Carousel</h1>
          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving || !config}
              className="px-4 py-2 bg-soralia-primary text-white rounded-lg hover:bg-soralia-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {saved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            Configuration saved successfully.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {config?.items.map((item, index) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">Slide {index + 1}</h3>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                  disabled={config.items.length <= 1}
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Image URL</label>
                  <input
                    type="text"
                    value={item.image}
                    onChange={e => updateItem(item.id, 'image', e.target.value)}
                    placeholder="/carousel/1.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={e => updateItem(item.id, 'title', e.target.value)}
                    placeholder="For Sale"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={item.subtitle ?? ''}
                    onChange={e => updateItem(item.id, 'subtitle', e.target.value)}
                    placeholder="2 Bedroom Family Home"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Link URL</label>
                  <input
                    type="text"
                    value={item.link ?? ''}
                    onChange={e => updateItem(item.id, 'link', e.target.value)}
                    placeholder="# or /events/upcoming"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary/50"
                  />
                </div>
              </div>

              {item.image && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Preview:</p>
                  <div className="relative h-32 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addItem}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-soralia-primary hover:text-soralia-primary transition-colors"
          >
            + Add Slide
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
