'use client';

import { LoadingSpinner } from '@shared/ui';
import type { MaintenanceRequest } from './types';
import { formatDate, getDaysOld, friendlyStatus, priorityColors, statusColors } from './constants';

interface RequestCardsProps {
  loading: boolean;
  requests: MaintenanceRequest[];
  search: string;
  statusFilter: string;
  priorityFilter: string;
  categoryFilter: string;
  onSelect: (request: MaintenanceRequest) => void;
  onClearFilters: () => void;
}

export function RequestCards({
  loading,
  requests,
  search,
  statusFilter,
  priorityFilter,
  categoryFilter,
  onSelect,
  onClearFilters,
}: RequestCardsProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (requests.length === 0) {
    const hasFilters =
      search || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all';
    return (
      <div className="text-center py-12 bg-white rounded-lg">
        <p className="text-gray-500">No maintenance requests found.</p>
        {hasFilters && (
          <button onClick={onClearFilters} className="mt-2 text-indigo-600 hover:text-indigo-800">
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map(request => {
        const daysOld = getDaysOld(request.createdAt);
        return (
          <div
            key={request.id}
            onClick={() => onSelect(request)}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {request.ticketNumber ? (
                    <span className="text-sm font-mono text-indigo-600 font-semibold">
                      #{request.ticketNumber}
                    </span>
                  ) : (
                    <span className="text-sm font-mono text-gray-400">#---</span>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">
                    {request.category.replace('_', ' ')}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[request.priority]}`}
                  >
                    {request.priority}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}
                  >
                    {friendlyStatus(request.status)}
                  </span>
                  {daysOld > 7 &&
                    request.status !== 'COMPLETED' &&
                    request.status !== 'CANCELLED' && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {daysOld} days old
                      </span>
                    )}
                </div>
                {(request.assignedTeam || request.assignedProvider) && (
                  <p className="text-xs text-gray-500 mb-1">
                    Assigned: {request.assignedTeam?.name || request.assignedProvider?.companyName}
                    {request.assignedTeam?.trade && ` (${request.assignedTeam.trade})`}
                    {request.assignedProvider?.trade && ` (${request.assignedProvider.trade})`}
                  </p>
                )}
                <p className="text-sm text-gray-500 mb-2">
                  <span className="font-medium text-gray-700">
                    {request.user?.name || 'Unknown'}
                  </span>
                  {' • '}
                  {request.user?.address?.street
                    ? `${request.user.address.street}${request.user.address.unit ? `, ${request.user.address.unit}` : ''}`
                    : 'Address on file'}
                  {' • '}
                  {request.user?.email || 'No email'}
                </p>
                <p className="text-gray-700 line-clamp-2">{request.description}</p>
              </div>
              <div className="text-sm text-gray-500 text-right ml-4">
                <div>{formatDate(request.createdAt)}</div>
                {request.images?.length > 0 && (
                  <div className="text-indigo-600">
                    {request.images.length} image{request.images.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
