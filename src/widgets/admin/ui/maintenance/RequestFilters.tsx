'use client';

import type { MaintenanceCategory } from '@entities/maintenance';
import { statusOptions, priorityOptions, friendlyStatus } from './constants';
import { CategoryManager } from './CategoryManager';

interface CategoryFilterOption {
  value: string;
  label: string;
}

interface RequestFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  priorityFilter: string;
  onPriorityChange: (v: string) => void;
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
  categoryFilterOptions: CategoryFilterOption[];
  showCategoryManager: boolean;
  onToggleCategoryManager: () => void;
  categories: MaintenanceCategory[];
  editingCategory: string | null;
  editCategoryLabel: string;
  editCategoryDesc: string;
  newCategoryValue: string;
  newCategoryLabel: string;
  newCategoryDesc: string;
  onStartEditCategory: (id: string, label: string, desc: string) => void;
  onCancelEditCategory: () => void;
  onEditLabelChange: (v: string) => void;
  onEditDescChange: (v: string) => void;
  onSaveEditCategory: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onNewValueChange: (v: string) => void;
  onNewLabelChange: (v: string) => void;
  onNewDescChange: (v: string) => void;
  onAddCategory: () => void;
}

export function RequestFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  categoryFilter,
  onCategoryChange,
  categoryFilterOptions,
  showCategoryManager,
  onToggleCategoryManager,
  categories,
  editingCategory,
  editCategoryLabel,
  editCategoryDesc,
  newCategoryValue,
  newCategoryLabel,
  newCategoryDesc,
  onStartEditCategory,
  onCancelEditCategory,
  onEditLabelChange,
  onEditDescChange,
  onSaveEditCategory,
  onDeleteCategory,
  onNewValueChange,
  onNewLabelChange,
  onNewDescChange,
  onAddCategory,
}: RequestFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            placeholder="Search by name, email, address, description, ticket #..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={e => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="all">All Statuses</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {friendlyStatus(status)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={priorityFilter}
            onChange={e => onPriorityChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="all">All Priorities</option>
            {priorityOptions.map(priority => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <button
            onClick={onToggleCategoryManager}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {showCategoryManager ? 'Close' : 'Manage Categories'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategoryChange('all')}
            className={`px-3 py-1 rounded-full text-sm ${
              categoryFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categoryFilterOptions.map(cat => (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              className={`px-3 py-1 rounded-full text-sm ${
                categoryFilter === cat.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {showCategoryManager && (
          <CategoryManager
            categories={categories}
            editingCategory={editingCategory}
            editCategoryLabel={editCategoryLabel}
            editCategoryDesc={editCategoryDesc}
            newCategoryValue={newCategoryValue}
            newCategoryLabel={newCategoryLabel}
            newCategoryDesc={newCategoryDesc}
            onStartEdit={onStartEditCategory}
            onCancelEdit={onCancelEditCategory}
            onEditLabelChange={onEditLabelChange}
            onEditDescChange={onEditDescChange}
            onSaveEdit={onSaveEditCategory}
            onDeleteCategory={onDeleteCategory}
            onNewValueChange={onNewValueChange}
            onNewLabelChange={onNewLabelChange}
            onNewDescChange={onNewDescChange}
            onAddCategory={onAddCategory}
          />
        )}
      </div>
    </div>
  );
}
