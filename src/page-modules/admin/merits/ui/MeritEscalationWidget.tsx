'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import Link from 'next/link';

interface EscalationData {
  reviewFlagged: number;
  suspensionRecommended: number;
}

export function MeritEscalationWidget() {
  const [data, setData] = useState<EscalationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/merits?status=ACTIVE&limit=100')
      .then(res => res.json())
      .then(result => {
        const rows = result.data || [];
        const counts: Record<string, number> = {};
        rows
          .filter((r: { behaviorType: string; status: string }) => r.behaviorType === 'INFRACTION')
          .forEach((r: { userId: string | number }) => {
            counts[r.userId] = (counts[r.userId] || 0) + 1;
          });
        setData({
          reviewFlagged: Object.values(counts).filter(c => c >= 3).length,
          suspensionRecommended: Object.values(counts).filter(c => c >= 5).length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-sm">Escalation Status</h3>
      </div>
      {data ? (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Review Flagged: {data.reviewFlagged} residents (3+ infractions)</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>
              Suspension Recommended: {data.suspensionRecommended} residents (5+ infractions)
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No escalation data available</p>
      )}
      <Link
        href="/admin/merits"
        className="text-xs text-indigo-600 hover:underline mt-2 inline-block"
      >
        View all records →
      </Link>
    </div>
  );
}
