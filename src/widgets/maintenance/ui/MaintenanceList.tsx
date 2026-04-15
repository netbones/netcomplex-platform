'use client';

import { MaintenanceRequest } from '@entities/maintenance';

interface MaintenanceListProps {
  requests: MaintenanceRequest[];
  loading: boolean;
  onNewRequest?: () => void;
  t: (key: string) => string;
}

export function MaintenanceList({ requests, loading, onNewRequest, t }: MaintenanceListProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No maintenance requests yet.</p>
        {onNewRequest && (
          <button onClick={onNewRequest} className="text-soralia-primary hover:underline">
            {t('maintenance:submitFirst')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map(request => (
        <div key={request.id} className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg capitalize">
                {request.category.replace('_', ' ')}
              </h3>
              <p className="text-gray-600 mt-1">{request.description}</p>
              <p className="text-sm text-gray-500 mt-2">
                Submitted: {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                request.status === 'SUBMITTED'
                  ? 'bg-yellow-100 text-yellow-800'
                  : request.status === 'IN_PROGRESS'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
              }`}
            >
              {request.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
