'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface AchievementDefinition {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  category: string;
  threshold: number;
  enabled: boolean;
  customThreshold?: number | null;
}

export function AdminAchievementsWidget() {
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/achievements', { credentials: 'same-origin' })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(body => {
        const data = body?.data ?? [];
        setDefinitions(
          data.map((d: Record<string, unknown>) => ({
            id: d.id,
            key: d.key,
            label: d.label,
            description: d.description,
            category: d.category,
            threshold: d.threshold,
            enabled: d.enabled !== false,
            customThreshold: d.customThreshold,
          }))
        );
      })
      .catch(() => toast.error('Failed to load achievements'))
      .finally(() => setLoading(false));
  }, []);

  const toggleEnabled = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/achievements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ enabled: !current }),
      });
      if (!res.ok) throw new Error();
      setDefinitions(prev => prev.map(d => (d.id === id ? { ...d, enabled: !current } : d)));
      toast.success(current ? 'Achievement disabled' : 'Achievement enabled');
    } catch {
      toast.error('Failed to update');
    }
  };

  const updateThreshold = async (id: string, value: string) => {
    const num = value === '' ? null : parseInt(value, 10);
    if (num !== null && (isNaN(num) || num < 1)) return;

    try {
      const res = await fetch(`/api/admin/achievements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ customThreshold: num }),
      });
      if (!res.ok) throw new Error();
      setDefinitions(prev => prev.map(d => (d.id === id ? { ...d, customThreshold: num } : d)));
      toast.success('Threshold updated');
    } catch {
      toast.error('Failed to update threshold');
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
        <span className="text-sm font-medium">Achievement Catalog</span>
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
            {cat === 'all' ? 'All' : cat}
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
            <input
              type="number"
              min={1}
              value={def.customThreshold ?? ''}
              placeholder={String(def.threshold)}
              onChange={e => updateThreshold(def.id, e.target.value)}
              className="w-14 px-1 py-0.5 text-xs text-center border rounded dark:bg-gray-800 dark:border-gray-700"
              title="Custom threshold (blank = default)"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
