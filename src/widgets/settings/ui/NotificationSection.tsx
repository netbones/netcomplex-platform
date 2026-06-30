'use client';

type Channel = 'inApp' | 'email';
type NotificationPrefs = Record<string, { inApp: boolean; email: boolean }>;

const NOTIF_TYPES = ['info', 'warning', 'success', 'error'] as const;

const NOTIF_LABELS: Record<string, string> = {
  info: 'General updates',
  warning: 'Warnings & alerts',
  success: 'Success confirmations',
  error: 'Error notices',
};

interface NotificationSectionProps {
  notificationPrefs: NotificationPrefs;
  onToggle: (type: string, channel: Channel) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export function NotificationSection({
  notificationPrefs,
  onToggle,
  onSave,
  saving,
}: NotificationSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Notifications</h2>
      <p className="text-sm text-gray-600 mb-4">
        Choose which types of notifications you receive and how.
      </p>
      <div className="space-y-3">
        {NOTIF_TYPES.map(type => {
          const pref = notificationPrefs[type] || { inApp: true, email: true };
          return (
            <div
              key={type}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <span className="text-sm font-medium text-gray-700 capitalize w-32">
                {NOTIF_LABELS[type]}
              </span>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pref.inApp}
                    onChange={() => onToggle(type, 'inApp')}
                    className="w-4 h-4 text-soralia-primary border-gray-300 rounded focus:ring-soralia-primary"
                  />
                  In-app
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pref.email}
                    onChange={() => onToggle(type, 'email')}
                    className="w-4 h-4 text-soralia-primary border-gray-300 rounded focus:ring-soralia-primary"
                  />
                  Email
                </label>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="mt-4 px-4 py-2 bg-soralia-primary text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Notification Preferences'}
      </button>
    </div>
  );
}
