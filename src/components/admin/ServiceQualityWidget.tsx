'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface QualityAlert {
  id: string;
  type: 'LOW_RATING' | 'INACTIVE' | 'COMPLAINT';
  listing: { id: string; title: string };
  provider: { name: string };
  details: string;
}

export function ServiceQualityWidget() {
  const { t } = useTranslation('admin');
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/community-services/listings?featured=true&limit=5');
        if (res.ok) {
          const data = await res.json();
          const listings = data.listings || [];
          const qualityAlerts: QualityAlert[] = listings
            .filter((l: { rating?: number }) => l.rating && l.rating < 3)
            .map(
              (l: { id: string; title: string; provider: { name: string }; rating: number }) => ({
                id: l.id,
                type: 'LOW_RATING' as const,
                listing: { id: l.id, title: l.title },
                provider: { name: l.provider?.name || 'Unknown' },
                details: `Low rating: ${l.rating}/5`,
              })
            );
          setAlerts(qualityAlerts);
        }
      } catch (err) {
        console.error('Failed to fetch quality alerts:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'LOW_RATING':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'INACTIVE':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'COMPLAINT':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'LOW_RATING':
        return 'fa-star-of-life';
      case 'INACTIVE':
        return 'fa-clock';
      case 'COMPLAINT':
        return 'fa-exclamation-triangle';
      default:
        return 'fa-info-circle';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        <i className="fas fa-shield-alt mr-2 text-red-600" />
        {t('serviceQuality', 'Service Quality Monitor')}
      </h3>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-8">
          <i className="fas fa-check-circle text-green-500 text-3xl mb-2" />
          <p className="text-gray-500 text-sm">No quality issues detected</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}>
              <div className="flex items-start gap-3">
                <i className={`fas ${getAlertIcon(alert.type)} mt-1`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{alert.listing.title}</p>
                  <p className="text-xs opacity-75">{alert.provider.name}</p>
                  <p className="text-xs mt-1">{alert.details}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
