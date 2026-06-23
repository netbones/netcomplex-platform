'use client';

import { useState } from 'react';
import { useSafeTranslation } from '@shared/lib';
import { useWidgetStore } from '@entities/widget';
import { WidgetRenderer } from '@widgets/dashboard';

interface WidgetCardProps {
  id: string;
  title: string;
  icon: string;
  spaceId: string;
  isEditMode?: boolean;
  onRemove?: () => void;
}

export function WidgetCard({
  id,
  title,
  icon,
  spaceId,
  isEditMode = false,
  onRemove,
}: WidgetCardProps) {
  const { tx } = useSafeTranslation('dashboard');
  const { layouts } = useWidgetStore();
  const [isLocalCollapsed, setIsLocalCollapsed] = useState(false);

  const spaceLayouts = layouts[spaceId] || {};
  const widgetLayout = spaceLayouts[id] || {};
  const isCollapsedState = widgetLayout.isCollapsed ?? false;

  const isCollapsed = isLocalCollapsed || isCollapsedState;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4 w-full">
      <div
        className={`flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-600 ${
          isEditMode ? '' : 'cursor-pointer'
        }`}
        onClick={isEditMode ? undefined : () => setIsLocalCollapsed(!isLocalCollapsed)}
      >
        <div className="flex items-center gap-3">
          <i className={`fas ${icon} text-white text-lg`}></i>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              setIsLocalCollapsed(!isLocalCollapsed);
            }}
            className="p-1 hover:bg-white/20 rounded transition-colors pointer-events-auto"
            title={isCollapsed ? tx('expandWidget', 'Expand') : tx('collapseWidget', 'Collapse')}
          >
            <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'} text-white text-sm`}></i>
          </button>
          {isEditMode && onRemove && (
            <button
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                onRemove();
              }}
              className="p-1 rounded transition-colors pointer-events-auto"
              title={tx('removeWidget', 'Remove widget')}
            >
              <i className="fas fa-times text-white/70 hover:text-red-400 text-sm transition-colors"></i>
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4">
          <WidgetRenderer widgetId={id} />
        </div>
      )}
    </div>
  );
}
