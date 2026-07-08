'use client';

import { useState, useMemo } from 'react';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableWidgets: { id: string; label: string; icon: string }[];
  onSelect: (widgetId: string) => void;
}

export function AddWidgetModal({
  isOpen,
  onClose,
  availableWidgets,
  onSelect,
}: AddWidgetModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWidgets = useMemo(() => {
    if (!searchQuery.trim()) return availableWidgets;
    const query = searchQuery.toLowerCase().trim();
    return availableWidgets.filter(w => w.label.toLowerCase().includes(query));
  }, [availableWidgets, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Add Widget</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="relative mb-4">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            autoFocus
          />
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filteredWidgets.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">
              {searchQuery.trim()
                ? `No widgets matching "${searchQuery.trim()}"`
                : 'No widgets available'}
            </p>
          ) : (
            filteredWidgets.map(widget => (
              <button
                key={widget.id}
                onClick={() => {
                  onSelect(widget.id);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 transition text-left"
              >
                <i className={`fas ${widget.icon} text-indigo-600 w-6`}></i>
                <span className="font-medium">{widget.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
