'use client';

import { useState } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

interface DisputeResolveDialogProps {
  recordId: string;
  residentName: string;
  behaviorType: string;
  reason: string;
  disputeReason: string;
  disputedAt: string;
  onClose: () => void;
  onResolved: () => void;
}

export function DisputeResolveDialog({
  recordId,
  residentName,
  behaviorType,
  reason,
  disputeReason,
  disputedAt,
  onClose,
  onResolved,
}: DisputeResolveDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResolve = async (verdict: 'UPHOLD' | 'OVERTURN') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/merits/${recordId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.message || 'Failed to resolve dispute');
      } else {
        onResolved();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold">Resolve Dispute</h2>
        </div>

        <div className="space-y-2 mb-4 text-sm">
          <p>
            <strong>Resident:</strong> {residentName}
          </p>
          <p>
            <strong>Type:</strong> {behaviorType}
          </p>
          <p>
            <strong>Reason:</strong> {reason}
          </p>
          <p>
            <strong>Dispute:</strong> {disputeReason}
          </p>
          <p>
            <strong>Disputed:</strong> {new Date(disputedAt).toLocaleString()}
          </p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-2 rounded mb-3 text-xs">{error}</div>}

        <div className="flex gap-3">
          <button
            onClick={() => handleResolve('UPHOLD')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 text-white py-2 px-4 rounded-md disabled:opacity-50"
            style={{ backgroundColor: '#4F46E5' }}
          >
            <Check className="w-4 h-4" />
            Uphold Decision
          </button>
          <button
            onClick={() => handleResolve('OVERTURN')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 text-white py-2 px-4 rounded-md disabled:opacity-50"
            style={{ backgroundColor: '#DC2626' }}
          >
            <X className="w-4 h-4" />
            Overturn
          </button>
        </div>
        <p className="text-xs text-red-600 mt-2">
          Overturn: This will remove the penalty points and mark the record as overturned. This
          cannot be undone.
        </p>

        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-500 hover:underline w-full text-center"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
