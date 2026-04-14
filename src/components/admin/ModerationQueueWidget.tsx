'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('ModerationQueueWidget');

interface ModerationQueueWidgetProps {
  initialListings?: Listing[];
}

interface Listing {
  id: string;
  title: string;
  category: string;
  provider: { name: string; email: string };
  createdAt: string;
  status: string;
}

export function ModerationQueueWidget({ initialListings = [] }: ModerationQueueWidgetProps) {
  const { t } = useTranslation('admin');
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [loading, setLoading] = useState(!initialListings.length);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');

  const fetchListings = async () => {
    try {
      const res = await fetch(`/api/community-services/moderation/listings?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
      }
    } catch (err) {
      log.error({}, 'Failed to fetch moderation listings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/community-services/moderation/listings/${id}/approve`, {
        method: 'POST',
      });
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      log.error({}, 'Failed to approve listing', err);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await fetch(`/api/community-services/moderation/listings/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      log.error({}, 'Failed to reject listing', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          <i className="fas fa-gavel mr-2 text-amber-600" />
          {t('moderationQueue', 'Moderation Queue')}
        </h3>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as 'PENDING' | 'ALL')}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="PENDING">Pending</option>
          <option value="ALL">All</option>
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <p className="text-gray-500 text-sm">{t('noListings', 'No listings pending moderation')}</p>
      ) : (
        <div className="space-y-3">
          {listings.map(listing => (
            <div key={listing.id} className="border rounded-lg p-3 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{listing.title}</h4>
                  <p className="text-sm text-gray-500">
                    {listing.category} • {listing.provider.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(listing.id)}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(listing.id)}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
