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
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onAddWidget?: (tabId: string) => void;
  onResetLayout?: (tabId: string) => void;
}

export function DashboardTabs({
  tabs,
  activeTab,
  onTabChange,
  isEditMode = false,
  onToggleEditMode,
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
        {isEditMode && onAddWidget && (
          <button
            onClick={() => onAddWidget(activeTab)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-600 hover:bg-gray-100 border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-all"
          >
            <i className="fas fa-plus"></i>
            <span>Add Widget</span>
          </button>
        )}
        {isEditMode && onResetLayout && (
          <button
            onClick={() => onResetLayout(activeTab)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 border border-gray-300 hover:border-red-300 transition-all"
            title="Reset dashboard layout to default"
          >
            <i className="fas fa-undo"></i>
            <span>Reset Layout</span>
          </button>
        )}
        {onToggleEditMode && (
          <button
            onClick={onToggleEditMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
              isEditMode
                ? 'bg-green-600 text-white shadow-md hover:bg-green-700'
                : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
            }`}
          >
            <i className={`fas ${isEditMode ? 'fa-check' : 'fa-pencil-alt'}`}></i>
            <span>{isEditMode ? 'Done' : 'Edit'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
