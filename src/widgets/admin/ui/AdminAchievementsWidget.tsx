'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { Trophy, icons } from 'lucide-react';
import { toast } from 'sonner';
import { useSafeTranslation } from '@shared/lib';
import { apiGet, apiPatch } from '@/shared/api/http-client';

interface AchievementDefinition {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  category: string;
  threshold: number;
  enabled: boolean;
  customThreshold?: number | null;
  icon?: string | null;
}

export function AdminAchievementsWidget() {
  const { tx } = useSafeTranslation('admin');
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    apiGet<Partial<AchievementDefinition>[]>('/api/achievements')
      .then(({ data }) => {
        setDefinitions(
          data.map(d => ({
            id: d.id ?? '',
            key: d.key ?? '',
            label: d.label ?? '',
            description: d.description,
            category: d.category ?? '',
            threshold: d.threshold ?? 0,
            enabled: d.enabled !== false,
            customThreshold: d.customThreshold,
            icon: d.icon ?? null,
          }))
        );
      })
      .catch(() => toast.error(tx('achievements.failedLoad', 'Failed to load achievements')))
      .finally(() => setLoading(false));
  }, []);

  const toggleEnabled = async (id: string, current: boolean) => {
    try {
      await apiPatch(`/api/admin/achievements/${id}`, { enabled: !current });
      setDefinitions(prev => prev.map(d => (d.id === id ? { ...d, enabled: !current } : d)));
      toast.success(
        current
          ? tx('achievements.disabled', 'Achievement disabled')
          : tx('achievements.enabled', 'Achievement enabled')
      );
    } catch {
      toast.error(tx('achievements.failedUpdate', 'Failed to update'));
    }
  };

  const updateIcon = async (id: string, value: string) => {
    const icon = value || null;
    try {
      await apiPatch(`/api/admin/achievements/${id}`, { icon });
      setDefinitions(prev => prev.map(d => (d.id === id ? { ...d, icon } : d)));
      toast.success('Icon updated');
    } catch {
      toast.error('Failed to update icon');
    }
  };

  const updateThreshold = async (id: string, value: string) => {
    const num = value === '' ? null : parseInt(value, 10);
    if (num !== null && (isNaN(num) || num < 1)) return;

    try {
      await apiPatch(`/api/admin/achievements/${id}`, { customThreshold: num });
      setDefinitions(prev => prev.map(d => (d.id === id ? { ...d, customThreshold: num } : d)));
      toast.success(tx('achievements.thresholdUpdated', 'Threshold updated'));
    } catch {
      toast.error(tx('achievements.failedThreshold', 'Failed to update threshold'));
    }
  };

  const filtered = filter === 'all' ? definitions : definitions.filter(d => d.category === filter);

  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-indigo-500" />
        <span className="text-sm font-medium">
          {tx('achievements.catalog', 'Achievement Catalog')}
        </span>
      </div>

      <div className="flex gap-1 mb-3">
        {['all', 'ENGAGEMENT', 'CONTRIBUTION', 'MILESTONE'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2 py-1 text-xs rounded ${
              filter === cat
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {cat === 'all'
              ? tx('achievements.filterAll', 'All')
              : tx(
                  `achievements.category${cat.charAt(0) + cat.slice(1).toLowerCase()}`,
                  cat.charAt(0) + cat.slice(1).toLowerCase()
                )}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {filtered.map(def => (
          <div
            key={def.id}
            className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <button
              onClick={() => toggleEnabled(def.id, def.enabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                def.enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  def.enabled ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">{def.label}</span>
              <span className="text-[10px] text-gray-400">{def.category}</span>
            </div>
            <div className="flex items-center gap-1">
              {(() => {
                const Icon = def.icon
                  ? (icons[def.icon as keyof typeof icons] as
                      | ComponentType<{ className?: string }>
                      | undefined)
                  : undefined;
                return Icon ? (
                  <Icon className="w-4 h-4 text-indigo-500" />
                ) : (
                  <Trophy className="w-4 h-4 text-gray-300" />
                );
              })()}
              <input
                type="text"
                value={def.icon ?? ''}
                placeholder="icon"
                onChange={e => updateIcon(def.id, e.target.value)}
                className="w-16 px-1 py-0.5 text-xs border rounded dark:bg-gray-800 dark:border-gray-700"
                title="Lucide icon name"
              />
              <input
                type="number"
                min={1}
                value={def.customThreshold ?? ''}
                placeholder={String(def.threshold)}
                onChange={e => updateThreshold(def.id, e.target.value)}
                className="w-14 px-1 py-0.5 text-xs text-center border rounded dark:bg-gray-800 dark:border-gray-700"
                title={tx('achievements.customThreshold', 'Custom threshold (blank = default)')}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
