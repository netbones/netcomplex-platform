'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, AlertTriangle, Check, Clock, X, Plus } from 'lucide-react';

interface CommunityMerit {
  id: string;
  userId: string;
  behaviorType: 'MERIT' | 'WARNING' | 'INFRACTION';
  category: string;
  reason: string;
  recognitionPoints: number;
  disciplinaryPoints: number;
  status: 'ACTIVE' | 'DISPUTED' | 'UPHELD' | 'OVERTURNED';
  createdAt: string;
}

interface EscalationSummary {
  infractionCount: number;
  reviewFlagged: number;
  suspensionRecommended: number;
}

const TYPE_BADGE: Record<string, { className: string; label: string }> = {
  MERIT: { className: 'bg-green-100 text-green-800', label: 'Merit' },
  WARNING: { className: 'bg-yellow-100 text-yellow-800', label: 'Warning' },
  INFRACTION: { className: 'bg-red-100 text-red-800', label: 'Infraction' },
};

const STATUS_ICON: Record<string, { icon: typeof Check; className: string }> = {
  ACTIVE: { icon: Clock, className: 'text-green-600' },
  DISPUTED: { icon: AlertTriangle, className: 'text-amber-600' },
  UPHELD: { icon: Check, className: 'text-green-600' },
  OVERTURNED: { icon: X, className: 'text-gray-400' },
};

export function MeritsListPage() {
  const [records, setRecords] = useState<CommunityMerit[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');

  useEffect(() => {
    fetch('/api/merits?limit=50')
      .then(res => res.json())
      .then(data => setRecords(data.data || []))
      .catch(() => setError('Failed to load behavior records'))
      .finally(() => setLoading(false));
  }, []);

  const summary: EscalationSummary = {
    infractionCount: records.filter(
      r => r.behaviorType === 'INFRACTION' && (r.status === 'ACTIVE' || r.status === 'UPHELD')
    ).length,
    reviewFlagged: 0,
    suspensionRecommended: 0,
  };

  const escalateCounts: Record<string, number> = {};
  records
    .filter(
      r => r.behaviorType === 'INFRACTION' && (r.status === 'ACTIVE' || r.status === 'UPHELD')
    )
    .forEach(r => {
      escalateCounts[r.userId] = (escalateCounts[r.userId] || 0) + 1;
    });
  summary.reviewFlagged = Object.values(escalateCounts).filter(c => c >= 3).length;
  summary.suspensionRecommended = Object.values(escalateCounts).filter(c => c >= 5).length;

  if (loading)
    return (
      <div className="p-6">
        <Shield className="animate-spin w-8 h-8 text-indigo-600" />
      </div>
    );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Image src="/platform/merits.svg" alt="" width={32} height={32} className="w-8 h-8" />
            Community Merits
          </h1>
          <p className="text-sm text-gray-500 mt-1">Behavior records and standing management</p>
        </div>
        <Link
          href="/admin/merits/new"
          className="inline-flex items-center gap-2 text-white px-4 py-2 rounded-md"
          style={{ backgroundColor: '#4F46E5' }}
        >
          <Plus className="w-4 h-4" />
          Record Entry
        </Link>
      </div>

      {summary.infractionCount > 0 && (
        <div className="bg-gray-50 border rounded-md p-3 mb-4 text-sm text-gray-600 flex gap-6">
          <span>Infractions this month: {summary.infractionCount}</span>
          {summary.reviewFlagged > 0 && (
            <span className="text-amber-700 font-medium">
              ⚠ Review Flagged: {summary.reviewFlagged} (3+)
            </span>
          )}
          {summary.suspensionRecommended > 0 && (
            <span className="text-red-700 font-medium">
              🔴 Suspension Recommended: {summary.suspensionRecommended} (5+)
            </span>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Recognition</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Disciplinary</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No behavior records found.
                </td>
              </tr>
            ) : (
              records.map(record => {
                const typeConf = TYPE_BADGE[record.behaviorType] || {
                  className: 'bg-gray-100 text-gray-800',
                  label: record.behaviorType,
                };
                const statusConf = STATUS_ICON[record.status] || {
                  icon: Clock,
                  className: 'text-gray-600',
                };
                const StatusIcon = statusConf.icon;
                return (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeConf.className}`}
                      >
                        {typeConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {record.category.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      {record.recognitionPoints > 0 ? (
                        <span className="text-green-600 font-medium">
                          +{record.recognitionPoints}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {record.disciplinaryPoints > 0 ? (
                        <span className="text-red-600 font-medium">
                          -{record.disciplinaryPoints}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 ${statusConf.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {record.status === 'DISPUTED' && (
                        <span className="text-indigo-600 text-xs font-medium cursor-pointer">
                          Resolve
                        </span>
                      )}
                      {record.status === 'ACTIVE' && (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
