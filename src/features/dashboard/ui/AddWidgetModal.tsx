'use client';

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
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availableWidgets.map(widget => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
