import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Property } from '@entities/tenant';

interface PropertiesWidgetProps {
  properties: Property[];
  loading?: boolean;
}

export function PropertiesWidget({ properties = [], loading = false }: PropertiesWidgetProps) {
  const { t } = useTranslation('dashboard');

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse h-16 bg-gray-100 rounded-lg"></div>
        <div className="animate-pulse h-16 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
          <i className="fas fa-home text-gray-400"></i>
        </div>
        <p className="text-gray-500 text-sm">{t('noProperties', 'No properties registered')}</p>
        <p className="text-gray-400 text-xs mt-1">Property owners can add their properties</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {properties.map(property => (
        <Link
          key={property.id}
          href={`/unit/${property.id}`}
          className="block p-4 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:shadow-md transition group"
        >
          <div className="flex items-start gap-4">
            {property.homeImage ? (
              <img
                src={property.homeImage}
                alt={property.unit}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-indigo-100 flex items-center justify-center">
                <i className="fas fa-home text-indigo-400 text-xl"></i>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Unit {property.unit}</h3>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                  {t('owner', 'Owner')}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">{property.street}</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">{property.platformAddress}</p>

              {property.activeHousehold?.profiles &&
                property.activeHousehold.profiles.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-gray-500">
                      {property.activeHousehold.profiles.length} {t('residents', 'residents')}
                    </span>
                    <div className="flex -space-x-2">
                      {property.activeHousehold.profiles.slice(0, 3).map(profile => (
                        <div
                          key={profile.id}
                          className="w-5 h-5 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center"
                          title={profile.displayName}
                        >
                          <span className="text-[10px] text-emerald-600 font-medium">
                            {profile.displayName.charAt(0)}
                          </span>
                        </div>
                      ))}
                      {property.activeHousehold.profiles.length > 3 && (
                        <div className="w-5 h-5 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                          <span className="text-[10px] text-gray-500">
                            +{property.activeHousehold.profiles.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
            <i className="fas fa-chevron-right text-gray-300 group-hover:text-indigo-400"></i>
          </div>
        </Link>
      ))}
      {properties.length > 0 && (
        <Link
          href="/dashboard/properties"
          className="block text-center text-sm text-soralia-primary hover:underline mt-3"
        >
          {t('viewAllProperties', 'View all properties')}
        </Link>
      )}
    </div>
  );
}
