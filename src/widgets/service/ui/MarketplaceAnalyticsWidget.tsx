'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createComponentLogger } from '@shared/lib';
import { TrendingUp } from 'lucide-react';
import { apiGet } from '@/shared/api/http-client';

const log = createComponentLogger('MarketplaceAnalyticsWidget');

export function MarketplaceAnalyticsWidget() {
  const { t } = useTranslation('admin');
  const [stats, setStats] = useState({
    totalListings: 0,
    activeProviders: 0,
    pendingInquiries: 0,
    totalReviews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [listingsRes, inquiriesRes] = await Promise.all([
          apiGet<{ pagination?: { total?: number } }>('/api/community-services/listings?limit=1'),
          apiGet<{ pagination?: { total?: number } }>(
            '/api/community-services/inquiries?status=PENDING'
          ),
        ]);

        setStats({
          totalListings: listingsRes.data.pagination?.total || 0,
          activeProviders: 0,
          pendingInquiries: inquiriesRes.data.pagination?.total || 0,
          totalReviews: 0,
        });
      } catch (err) {
        log.error({}, 'Failed to fetch marketplace stats', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const metrics = [
    {
      label: 'Total Listings',
      value: stats.totalListings,
      icon: 'fa-list',
      color: 'text-blue-600',
    },
    {
      label: 'Active Providers',
      value: stats.activeProviders,
      icon: 'fa-users',
      color: 'text-green-600',
    },
    {
      label: 'Pending Inquiries',
      value: stats.pendingInquiries,
      icon: 'fa-envelope',
      color: 'text-amber-600',
    },
    {
      label: 'Total Reviews',
      value: stats.totalReviews,
      icon: 'fa-star',
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        <TrendingUp className="mr-2 text-indigo-600" />
        {t('marketplaceAnalytics', 'Marketplace Analytics')}
      </h3>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {metrics.map(metric => (
            <div key={metric.label} className="text-center p-3 bg-gray-50 rounded-lg">
              <i className={`fas ${metric.icon} ${metric.color} text-xl mb-1`} />
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-xs text-gray-500">{metric.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
