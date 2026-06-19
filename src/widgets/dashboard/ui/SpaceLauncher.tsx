'use client';

import Link from 'next/link';
import { useSafeTranslation } from '@shared/lib';
import type { SpaceDefinition } from '../model/spaces';

const SPACE_FALLBACKS: Record<string, string> = {
  'spaces.home': 'Home',
  'spaces.services': 'Services',
  'spaces.community': 'Community',
  'spaces.messages': 'Messages',
  'spaces.admin': 'Admin',
};

interface SpaceLauncherProps {
  spaces: SpaceDefinition[];
  activeSpaceId: string;
  collapsed: boolean;
  onNavigate: (spaceId: string) => void;
  onToggleCollapse: () => void;
}

import { useEffect, useState } from 'react';

export function SpaceLauncher({
  spaces,
  activeSpaceId,
  collapsed,
  onNavigate,
  onToggleCollapse,
}: SpaceLauncherProps) {
  const { tx } = useSafeTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav
      className={`hidden md:flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
      aria-label="Dashboard spaces"
    >
      {/* Space items */}
      <div className="flex-1 py-4 space-y-1">
        {spaces.map(space => {
          const Icon = space.icon;
          const isActive = space.id === activeSpaceId;
          const href = space.href;
          const label = tx(space.labelKey, SPACE_FALLBACKS[space.labelKey] || space.labelKey);

          return (
            <Link
              key={space.id}
              href={href}
              onClick={() => onNavigate(space.id)}
              className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={mounted && collapsed ? label : undefined}
              title={mounted && collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Bottom: collapse/expand toggle */}
      <div className="border-t border-gray-200 p-2">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>
    </nav>
  );
}
