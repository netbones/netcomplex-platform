import { useTranslation } from 'react-i18next';

interface SoloSeat {
  id: string;
  platformAddress: string;
  seatType: string;
  isComplimentary: boolean;
  household: {
    id: string;
    street: string;
    unit: string;
  } | null;
}

interface SoloSeatWidgetProps {
  SoloSeat: SoloSeat | null;
  loading?: boolean;
}

export function SoloSeatWidget({ SoloSeat, loading = false }: SoloSeatWidgetProps) {
  const { t } = useTranslation('dashboard');

  if (loading) {
    return (
      <div className="animate-pulse h-24 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl"></div>
    );
  }

  if (!SoloSeat) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <i className="fas fa-crown text-gray-400"></i>
          </div>
          <div>
            <h3 className="font-medium text-gray-700">{t('SoloSeat', 'Premium Seat')}</h3>
            <p className="text-xs text-gray-500">
              {t('upgradeForBenefits', 'Upgrade for exclusive benefits')}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          {t('premiumDescription', 'Get a personal platform address and independent identity')}
        </p>
        <button className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition">
          {t('learnAboutUpgrade', 'Learn about upgrade')}
        </button>
      </div>
    );
  }

  const isResident = SoloSeat.seatType === 'RESIDENT';
  const isComplimentary = SoloSeat.isComplimentary;

  return (
    <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <i className="fas fa-crown text-indigo-600"></i>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{t('SoloSeat', 'Premium Seat')}</h3>
            <p className="text-xs text-gray-500">{SoloSeat.platformAddress}</p>
          </div>
        </div>
        <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
          {isResident ? t('resident', 'Resident') : t('member', 'Member')}
        </span>
      </div>

      {isComplimentary && (
        <div className="flex items-center gap-2 mb-3 text-sm text-emerald-700 bg-emerald-50 p-2 rounded">
          <i className="fas fa-star"></i>
          <span>{t('complimentarySeat', 'Complimentary Board Seat')}</span>
        </div>
      )}

      {SoloSeat.household && (
        <div className="text-sm text-gray-600 mb-3">
          <span className="text-gray-500">{t('linkedTo', 'Linked to')}: </span>
          <span className="font-medium">
            {SoloSeat.household.street}, Unit {SoloSeat.household.unit}
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <button className="flex-1 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-50 transition">
          {t('manageSeat', 'Manage Seat')}
        </button>
      </div>
    </div>
  );
}
