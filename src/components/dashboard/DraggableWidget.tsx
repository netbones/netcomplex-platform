'use client';

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
}

export function DraggableWidget({
  id,
  title,
  icon,
  children,
  removable = false,
  onRemove,
}: DraggableWidgetProps) {
  const { t } = useTranslation('dashboard');
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
          <i className={`fas ${icon} text-white text-lg`}></i>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {removable && onRemove && (
            <button
              onClick={e => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 text-white/70 hover:text-white hover:bg-white/20 rounded transition"
              title={t('removeWidget', 'Remove')}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
          <i className="fas fa-grip-vertical text-white/50 group-hover:text-white transition"></i>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
