'use client';

import { useMaintenanceFilter } from '../model/useMaintenanceFilter';
import type { MaintenanceStatus, MaintenancePriority } from '@entities/maintenance';

interface MaintenanceStatusFilterProps {
  onFiltersChange?: (filters: ReturnType<typeof useMaintenanceFilter>['filters']) => void;
}

const statusOptions: { value: MaintenanceStatus; label: string; color: string }[] = [
  { value: 'SUBMITTED', label: 'Submitted', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'ASSIGNED', label: 'Assigned', color: 'bg-purple-100 text-purple-800' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'PENDING_PARTS', label: 'Pending Parts', color: 'bg-orange-100 text-orange-800' },
  { value: 'SCHEDULED', label: 'Scheduled', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
];

const priorityOptions: { value: MaintenancePriority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'EMERGENCY', label: 'Emergency', color: 'bg-red-100 text-red-800' },
];

export function MaintenanceStatusFilter({ onFiltersChange }: MaintenanceStatusFilterProps) {
  const {
    filters,
    toggleStatus,
    togglePriority,
    setSearch,
    setTicketNumber,
    clearFilters,
    hasActiveFilters,
  } = useMaintenanceFilter();

  const handleStatusToggle = (status: MaintenanceStatus) => {
    toggleStatus(status);
    onFiltersChange?.({
      ...filters,
      status: filters.status?.includes(status)
        ? filters.status.filter(s => s !== status)
        : [...(filters.status || []), status],
    });
  };

  const handlePriorityToggle = (priority: MaintenancePriority) => {
    togglePriority(priority);
    onFiltersChange?.({
      ...filters,
      priority: filters.priority?.includes(priority)
        ? filters.priority.filter(p => p !== priority)
        : [...(filters.priority || []), priority],
    });
  };

  const handleSearchChange = (search: string) => {
    setSearch(search);
    onFiltersChange?.({ ...filters, search });
  };

  const handleTicketNumberChange = (ticketNumber: string) => {
    setTicketNumber(ticketNumber);
    onFiltersChange?.({ ...filters, ticketNumber });
  };

  const handleClearFilters = () => {
    clearFilters();
    onFiltersChange?.({ status: [], priority: [], category: [], search: '', ticketNumber: '' });
  };

  return (
    <div className="space-y-4 p-4 bg-white border rounded-lg">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
        <input
          type="text"
          placeholder="Search requests..."
          value={filters.search || ''}
          onChange={e => handleSearchChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        />
      </div>

      {/* Ticket Number Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Ticket Number</label>
        <input
          type="text"
          placeholder="e.g. SRV-2026-0001"
          value={filters.ticketNumber || ''}
          onChange={e => handleTicketNumberChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-soralia-primary font-mono text-sm"
        />
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handleStatusToggle(option.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.status?.includes(option.value)
                  ? option.color
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
        <div className="flex flex-wrap gap-2">
          {priorityOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handlePriorityToggle(option.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.priority?.includes(option.value)
                  ? option.color
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={handleClearFilters}
          className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}
