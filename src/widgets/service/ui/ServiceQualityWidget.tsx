'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createComponentLogger } from '@shared/lib';
import { apiGet } from '@/shared/api/http-client';

import { CheckCircle, Shield } from 'lucide-react';
const log = createComponentLogger('ServiceQualityWidget');

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
        const { data } = await apiGet<{ listings?: ServiceListing[] }>(
          '/api/community-services/listings?featured=true&limit=5'
        );
        const listings = data.listings || [];
        const qualityAlerts: QualityAlert[] = listings
          .filter((l: { rating?: number }) => l.rating && l.rating < 3)
          .map((l: { id: string; title: string; provider: { name: string }; rating: number }) => ({
            id: l.id,
            type: 'LOW_RATING' as const,
            listing: { id: l.id, title: l.title },
            provider: { name: l.provider?.name || 'Unknown' },
            details: `Low rating: ${l.rating}/5`,
          }));
        setAlerts(qualityAlerts);
      } catch (err) {
        log.error({}, 'Failed to fetch quality alerts', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  const ALERT_CONFIG: Record<QualityAlert['type'], { color: string; icon: string }> = {
    LOW_RATING: { color: 'bg-red-50 border-red-200 text-red-700', icon: 'fa-star-of-life' },
    INACTIVE: { color: 'bg-amber-50 border-amber-200 text-amber-700', icon: 'fa-clock' },
    COMPLAINT: {
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      icon: 'fa-exclamation-triangle',
    },
  };

  const DEFAULT_ALERT = {
    color: 'bg-gray-50 border-gray-200 text-gray-700',
    icon: 'fa-info-circle',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        <Shield className="mr-2 text-red-600" />
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
          <CheckCircle className="text-green-500 text-3xl mb-2" />
          <p className="text-gray-500 text-sm">No quality issues detected</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${ALERT_CONFIG[alert.type]?.color ?? DEFAULT_ALERT.color}`}
            >
              <div className="flex items-start gap-3">
                <i className={`fas ${ALERT_CONFIG[alert.type]?.icon ?? DEFAULT_ALERT.icon} mt-1`} />
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
