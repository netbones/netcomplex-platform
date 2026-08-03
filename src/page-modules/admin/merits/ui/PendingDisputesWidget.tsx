'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { apiGet } from '@/shared/api/http-client';

interface CommunityMerit {
  id: string;
  status: string;
}

export function PendingDisputesWidget() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<CommunityMerit[]>('/api/merits?status=DISPUTED&limit=1')
      .then(({ data }) => {
        setCount((data || []).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-sm">Pending Disputes</h3>
      </div>
      {count !== null && count > 0 ? (
        <p className="text-sm text-amber-700 font-medium">
          {count} dispute{count !== 1 ? 's' : ''} awaiting resolution
        </p>
      ) : (
        <p className="text-sm text-gray-500">No pending disputes</p>
      )}
      <Link
        href="/admin/merits"
        className="text-xs text-indigo-600 hover:underline mt-2 inline-block"
      >
        Manage disputes →
      </Link>
    </div>
  );
}
