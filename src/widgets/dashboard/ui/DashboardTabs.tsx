'use client';

export interface DashboardTab {
  id: string;
  label: string;
  icon: string;
  defaultWidgets: string[];
}

interface DashboardTabsProps {
  tabs: DashboardTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onAddWidget?: (tabId: string) => void;
  onResetLayout?: (tabId: string) => void;
}

export function DashboardTabs({
  tabs,
  activeTab,
  onTabChange,
  onAddWidget,
  onResetLayout,
}: DashboardTabsProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <i className={`fas ${tab.icon}`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
        {onAddWidget && (
          <button
            onClick={() => onAddWidget(activeTab)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-600 hover:bg-gray-100 border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-all"
          >
            <i className="fas fa-plus"></i>
            <span>Add Widget</span>
          </button>
        )}
        {onResetLayout && (
          <button
            onClick={() => onResetLayout(activeTab)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 border border-gray-300 hover:border-red-300 transition-all"
            title="Reset dashboard layout to default"
          >
            <i className="fas fa-undo"></i>
            <span>Reset Layout</span>
          </button>
        )}
      </div>
    </div>
  );
}

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
