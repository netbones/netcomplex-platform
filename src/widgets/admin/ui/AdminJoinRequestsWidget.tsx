'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/shared/api/http-client';
import { createComponentLogger } from '@shared/lib';
import { toast } from 'sonner';

const log = createComponentLogger('AdminJoinRequestsWidget');

type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
type RelationshipType = 'OWNER_RESIDENT' | 'OWNER_LEASING' | 'TENANT_RENTER' | 'ADDITIONAL_USER';

interface VehicleRow {
  id: string;
  joinRequestId: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  registration: string;
}

interface JoinRequestRow {
  id: string;
  tenantId: string;
  propertyId: string | null;
  propertyNumberRaw: string;
  relationshipType: RelationshipType;
  requestedName: string;
  requestedSurname: string | null;
  requestedEmail: string;
  requestedPhone: string | null;
  rulesAcceptedAt: string | null;
  status: JoinRequestStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  resultingInvitationId: string | null;
  createdAt: string;
  property: { id: string; street: string; unit: string } | null;
  vehicles: VehicleRow[];
}

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  OWNER_RESIDENT: 'Owner, resides',
  OWNER_LEASING: 'Owner, leases',
  TENANT_RENTER: 'Tenant, rents',
  ADDITIONAL_USER: 'Additional user',
};

function JoinRequestCard({
  request,
  onResolved,
}: {
  request: JoinRequestRow;
  onResolved: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const approve = async () => {
    try {
      await apiPost(`/api/admin/join-requests/${request.id}`, { action: 'approve' });
      toast.success('Request approved — invitation sent');
      onResolved();
    } catch (err) {
      log.error({ id: request.id }, 'Failed to approve join request', err);
      toast.error(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const reject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('A rejection reason is required');
      return;
    }
    setRejecting(true);
    try {
      await apiPost(`/api/admin/join-requests/${request.id}`, {
        action: 'reject',
        rejectionReason,
      });
      toast.success('Request rejected');
      onResolved();
    } catch (err) {
      log.error({ id: request.id }, 'Failed to reject join request', err);
      toast.error(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium text-gray-900">
            {request.requestedName}
            {request.requestedSurname ? ` ${request.requestedSurname}` : ''}
          </h4>
          <p className="text-sm text-gray-500">{request.requestedEmail}</p>
          <p className="text-sm text-gray-600 mt-1">
            {RELATIONSHIP_LABELS[request.relationshipType]} ·{' '}
            {request.property
              ? `${request.property.street} · Unit ${request.property.unit}`
              : `Unit ${request.propertyNumberRaw}`}
          </p>
          {request.vehicles.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {request.vehicles.length} vehicle{request.vehicles.length === 1 ? '' : 's'}:
              {request.vehicles.map(v => v.registration).join(', ')}
            </p>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void approve()}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Approve
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={rejectionReason}
          onChange={e => setRejectionReason(e.target.value)}
          placeholder="Rejection reason"
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md"
        />
        <button
          type="button"
          onClick={() => void reject()}
          disabled={rejecting}
          className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {rejecting ? '...' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

export function AdminJoinRequestsWidget() {
  const [requests, setRequests] = useState<JoinRequestRow[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await apiGet<{ requests: JoinRequestRow[] }>(
        `/api/admin/join-requests?status=${filter}`
      );
      setRequests(data.requests ?? []);
    } catch (err) {
      log.error({}, 'Failed to load join requests', err);
      toast.error('Failed to load join requests');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  if (loading) {
    return <div className="animate-pulse space-y-3">{/* skeleton */}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Join Requests</h3>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as 'PENDING' | 'ALL')}
          className="text-sm border border-gray-300 rounded-md px-2 py-1"
        >
          <option value="PENDING">Pending</option>
          <option value="ALL">All</option>
        </select>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No pending join requests</p>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <JoinRequestCard key={r.id} request={r} onResolved={() => void load()} />
          ))}
        </div>
      )}
    </div>
  );
}
