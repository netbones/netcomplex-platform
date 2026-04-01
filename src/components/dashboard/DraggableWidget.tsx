'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';

interface DraggableWidgetProps {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function DraggableWidget({
  id,
  title,
  icon,
  children,
  removable = false,
  onRemove,
  collapsible = true,
  defaultCollapsed = false,
}: DraggableWidgetProps) {
  const { t } = useTranslation('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg shadow-md overflow-hidden relative group"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-600 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-3">
          <i className={`fas fa-grip-vertical text-white/50 mr-2`}></i>
          <i className={`fas ${icon} text-white text-lg`}></i>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {collapsible && (
            <button
              onClick={e => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title={isCollapsed ? t('expandWidget', 'Expand') : t('collapseWidget', 'Collapse')}
            >
              <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'} text-white text-sm`}></i>
            </button>
          )}
          {removable && onRemove && (
            <button
              onClick={e => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title={t('removeWidget', 'Remove')}
            >
              <i className="fas fa-times text-white text-sm"></i>
            </button>
          )}
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-screen opacity-100'
        }`}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
