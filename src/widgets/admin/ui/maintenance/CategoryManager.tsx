'use client';

import type { MaintenanceCategory } from '@entities/maintenance';

interface CategoryManagerProps {
  categories: MaintenanceCategory[];
  editingCategory: string | null;
  editCategoryLabel: string;
  editCategoryDesc: string;
  newCategoryValue: string;
  newCategoryLabel: string;
  newCategoryDesc: string;
  onStartEdit: (id: string, label: string, desc: string) => void;
  onCancelEdit: () => void;
  onEditLabelChange: (v: string) => void;
  onEditDescChange: (v: string) => void;
  onSaveEdit: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onNewValueChange: (v: string) => void;
  onNewLabelChange: (v: string) => void;
  onNewDescChange: (v: string) => void;
  onAddCategory: () => void;
}

export function CategoryManager({
  categories,
  editingCategory,
  editCategoryLabel,
  editCategoryDesc,
  newCategoryValue,
  newCategoryLabel,
  newCategoryDesc,
  onStartEdit,
  onCancelEdit,
  onEditLabelChange,
  onEditDescChange,
  onSaveEdit,
  onDeleteCategory,
  onNewValueChange,
  onNewLabelChange,
  onNewDescChange,
  onAddCategory,
}: CategoryManagerProps) {
  return (
    <div className="mt-3 border rounded-lg p-4 bg-gray-50">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Manage Categories</h4>

      {categories.length === 0 ? (
        <p className="text-sm text-gray-500 mb-3">No categories yet. Add one below.</p>
      ) : (
        <div className="space-y-2 mb-4">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="flex items-center gap-2 bg-white rounded px-3 py-2 flex-wrap"
            >
              {editingCategory === cat.id ? (
                <>
                  <input
                    type="text"
                    value={editCategoryLabel}
                    onChange={e => onEditLabelChange(e.target.value)}
                    placeholder="Label"
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  />
                  <input
                    type="text"
                    value={editCategoryDesc}
                    onChange={e => onEditDescChange(e.target.value)}
                    placeholder="Description"
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  />
                  <button
                    onClick={() => onSaveEdit(cat.id)}
                    className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={onCancelEdit}
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="font-mono text-xs text-gray-500">{cat.value}</span>
                  <span className="text-sm font-medium text-gray-900 flex-1">{cat.label}</span>
                  {cat.description && (
                    <span className="text-xs text-gray-500 truncate max-w-[120px]">
                      {cat.description}
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${
                      cat.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cat.isActive ? 'Active' : 'Archived'}
                  </span>
                  <button
                    onClick={() => onStartEdit(cat.id, cat.label, cat.description || '')}
                    className="text-indigo-600 hover:text-indigo-800 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteCategory(cat.id)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Value (slug)</label>
          <input
            type="text"
            value={newCategoryValue}
            onChange={e => onNewValueChange(e.target.value)}
            placeholder="e.g. PLUMBING"
            className="w-full px-2 py-1.5 border rounded text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Label</label>
          <input
            type="text"
            value={newCategoryLabel}
            onChange={e => onNewLabelChange(e.target.value)}
            placeholder="e.g. Plumbing"
            className="w-full px-2 py-1.5 border rounded text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Description</label>
          <input
            type="text"
            value={newCategoryDesc}
            onChange={e => onNewDescChange(e.target.value)}
            placeholder="Optional"
            className="w-full px-2 py-1.5 border rounded text-sm"
          />
        </div>
        <button
          onClick={onAddCategory}
          disabled={!newCategoryValue.trim() || !newCategoryLabel.trim()}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed sm:self-end"
        >
          Add
        </button>
      </div>
    </div>
  );
}
