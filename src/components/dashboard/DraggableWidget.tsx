'use client';

import { useState, useEffect, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { useTranslation } from 'react-i18next';
import { useWidgetStore } from '@/lib/stores/widget-store';

interface DraggableWidgetProps {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  collapsible?: boolean;
  tabId: string; // Required for state management
}

export function DraggableWidget({
  id,
  title,
  icon,
  children,
  removable = false,
  onRemove,
  collapsible = true,
  tabId,
}: DraggableWidgetProps) {
  const { t } = useTranslation('dashboard');
  const { updateWidgetLayout, toggleWidgetCollapsed } = useWidgetStore();

  // Stable default layout to prevent infinite re-renders
  const defaultLayout = useMemo(
    () => ({
      x: 0,
      y: 0,
      width: 320,
      height: 200,
      isCollapsed: false,
    }),
    []
  );

  // Subscribe to the specific widget layout
  const layout = useWidgetStore(state => {
    const tabLayouts = state.layouts[tabId];
    return tabLayouts?.[id] || defaultLayout;
  });

  // Local state for immediate updates (position/size)
  const [position, setPosition] = useState({ x: layout.x, y: layout.y });
  const [size, setSize] = useState({ width: layout.width, height: layout.height });

  // Sync local state with store changes
  useEffect(() => {
    setPosition({ x: layout.x, y: layout.y });
    setSize({ width: layout.width, height: layout.height });
  }, [layout.x, layout.y, layout.width, layout.height]);

  const handleDragStop = (_e: any, d: { x: number; y: number }) => {
    setPosition(d);
    updateWidgetLayout(tabId, id, { x: d.x, y: d.y });
  };

  const handleResizeStop = (
    _e: any,
    _direction: any,
    ref: HTMLElement,
    _delta: any,
    position: { x: number; y: number }
  ) => {
    const newWidth = ref.offsetWidth;
    const newHeight = ref.offsetHeight;
    setSize({ width: newWidth, height: newHeight });
    setPosition(position);
    updateWidgetLayout(tabId, id, {
      x: position.x,
      y: position.y,
      width: newWidth,
      height: newHeight,
      ...(!layout.isCollapsed ? { lastHeight: newHeight } : {}), // Update lastHeight if not collapsed
    });
  };

  const handleToggleCollapsed = () => {
    // Use the store method which properly handles height transitions
    toggleWidgetCollapsed(tabId, id);
  };

  return (
    <Rnd
      size={size}
      position={position}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      minWidth={280}
      minHeight={60} // Match header height to prevent resizing below collapsed state
      maxWidth={800}
      maxHeight={600}
      bounds="parent"
      className="bg-white rounded-lg shadow-md overflow-hidden group"
      dragHandleClassName="drag-handle"
      enableResizing={
        layout.isCollapsed
          ? {}
          : {
              top: false,
              right: true,
              bottom: true,
              left: false,
              topRight: false,
              bottomRight: true,
              bottomLeft: false,
              topLeft: false,
            }
      }
    >
      {/* Header */}
      <div className="drag-handle flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-600 cursor-move">
        <div className="flex items-center gap-3">
          <i className="fas fa-grip-vertical text-white/50 mr-2"></i>
          <i className={`fas ${icon} text-white text-lg`}></i>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {collapsible && (
            <button
              onClick={handleToggleCollapsed}
              className="p-1 hover:bg-white/20 rounded transition-colors pointer-events-auto"
              title={
                layout.isCollapsed ? t('expandWidget', 'Expand') : t('collapseWidget', 'Collapse')
              }
            >
              <i
                className={`fas fa-chevron-${layout.isCollapsed ? 'down' : 'up'} text-white text-sm`}
              ></i>
            </button>
          )}
          {removable && onRemove && (
            <button
              onClick={onRemove}
              className="p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors pointer-events-auto shadow-sm border border-red-400/50 hover:border-red-400/80"
              title={t('removeWidget', 'Remove')}
            >
              <i className="fas fa-times text-white text-sm"></i>
            </button>
          )}
        </div>
      </div>

      {/* Content - only render when not collapsed */}
      {!layout.isCollapsed && (
        <div className="transition-all duration-300 ease-in-out overflow-hidden max-h-screen opacity-100">
          <div className="p-4">{children}</div>
        </div>
      )}

      {/* Resize handle - hide when collapsed */}
      {!layout.isCollapsed && (
        <div className="absolute bottom-0 right-0 w-5 h-5 bg-indigo-500 rounded-tl cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-white"></div>
        </div>
      )}
    </Rnd>
  );
}
