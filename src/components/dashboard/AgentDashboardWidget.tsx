'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

interface ManagedHousehold {
  id: string;
  street: string;
  unit: string;
  platformAddress: string;
  homeImage: string | null;
  accessExpiresAt: Date;
  grantedBy: {
    name: string;
  };
  standardSeats: {
    user: {
      name: string;
    };
  }[];
  profiles: {
    id: string;
    displayName: string;
    occupantType: string;
  }[];
}

interface AgentDashboardWidgetProps {
  households: ManagedHousehold[];
  loading?: boolean;
}

export function AgentDashboardWidget({ households, loading = false }: AgentDashboardWidgetProps) {
  const { t } = useTranslation('dashboard');

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse h-20 bg-gray-100 rounded-lg"></div>
        <div className="animate-pulse h-20 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  if (households.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
          <i className="fas fa-key text-gray-400"></i>
        </div>
        <p className="text-gray-500 text-sm">{t('noManagedProperties', 'No properties managed')}</p>
        <p className="text-gray-400 text-xs mt-1">Property owners can grant you access</p>
      </div>
    );
  }

  const isExpiringSoon = (expiresAt: Date) => {
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (new Date(expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7;
  };

  return (
    <div className="space-y-3">
      {households.map(household => (
        <div
          key={household.id}
          className={`p-4 rounded-lg border ${
            isExpiringSoon(household.accessExpiresAt)
              ? 'bg-amber-50 border-amber-200'
              : 'bg-slate-50 border-transparent hover:border-indigo-200'
          } transition group`}
        >
          <div className="flex items-start gap-4">
            {household.homeImage ? (
              <img
                src={household.homeImage}
                alt={household.unit}
                className="w-14 h-14 rounded-lg object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-indigo-100 flex items-center justify-center">
                <i className="fas fa-building text-indigo-400"></i>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Unit {household.unit}</h3>
                {isExpiringSoon(household.accessExpiresAt) && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1">
                    <i className="fas fa-exclamation-triangle"></i>
                    {t('expiring', 'Expiring')}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 truncate">{household.street}</p>
              <p className="text-xs text-gray-400 mt-1">
                {t('managedFor', 'Managed for')}: {household.grantedBy.name}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {household.profiles.length} {t('occupants', 'occupants')}
                </span>
                <span className="text-xs text-gray-400">
                  {t('expires', 'Expires')}:{' '}
                  {new Date(household.accessExpiresAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <Link
              href={`/unit/${household.id}/manage`}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              {t('manage', 'Manage')}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
