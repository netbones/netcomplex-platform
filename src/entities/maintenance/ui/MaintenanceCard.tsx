'use client';

import { MaintenanceRequest } from '../model/types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface MaintenanceCardProps {
  request: MaintenanceRequest;
  onClick?: (request: MaintenanceRequest) => void;
  showUser?: boolean;
  user?: {
    name: string;
    address?: { street: string; unit: string | null } | null;
  };
}

export function MaintenanceCard({
  request,
  onClick,
  showUser = false,
  user,
}: MaintenanceCardProps) {
  const handleClick = () => {
    onClick?.(request);
  };

  return (
    <div
      className={`p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        onClick ? 'hover:bg-gray-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate capitalize">
            {request.category.replace('_', ' ')}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={request.status} />
            <PriorityBadge priority={request.priority} />
          </div>
        </div>
        <span className="text-sm text-gray-500 ml-2">
          {new Date(request.createdAt).toLocaleDateString()}
        </span>
      </div>

      <p className="text-gray-700 text-sm line-clamp-2 mb-3">{request.description}</p>

      {showUser && user && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">{user.name}</span>
          {user.address && (
            <span className="ml-2">
              • {user.address.street}
              {user.address.unit && ` #${user.address.unit}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
