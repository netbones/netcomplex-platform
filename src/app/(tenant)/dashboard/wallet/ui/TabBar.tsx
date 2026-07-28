'use client';

import { useSafeTranslation } from '@shared/lib';
import type { TabKey } from '../model/helpers';
import { TABS } from '../model/helpers';

export function TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}) {
  const { tx } = useSafeTranslation();
  return (
    <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
      {TABS.map(tab => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === tab
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          {tx(`dwallet.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
        </button>
      ))}
    </div>
  );
}
