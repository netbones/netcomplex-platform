'use client';

interface PrivacySectionProps {
  isPublic: boolean;
  showEmail: boolean;
  showPhone: boolean;
  onTogglePublic: (checked: boolean) => void;
  onToggleEmail: (checked: boolean) => void;
  onTogglePhone: (checked: boolean) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export function PrivacySection({
  isPublic,
  showEmail,
  showPhone,
  onTogglePublic,
  onToggleEmail,
  onTogglePhone,
  onSave,
  saving,
}: PrivacySectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy</h2>
      <p className="text-sm text-gray-600 mb-4">
        Control what information is visible on your public profile.
      </p>
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={e => onTogglePublic(e.target.checked)}
            className="w-4 h-4 text-soralia-primary border-gray-300 rounded focus:ring-soralia-primary"
          />
          <span className="text-gray-700">Public profile</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showEmail}
            onChange={e => onToggleEmail(e.target.checked)}
            className="w-4 h-4 text-soralia-primary border-gray-300 rounded focus:ring-soralia-primary"
          />
          <span className="text-gray-700">Show email on public profile</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showPhone}
            onChange={e => onTogglePhone(e.target.checked)}
            className="w-4 h-4 text-soralia-primary border-gray-300 rounded focus:ring-soralia-primary"
          />
          <span className="text-gray-700">Show phone number on public profile</span>
        </label>
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="mt-4 px-4 py-2 bg-soralia-primary text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Privacy Settings'}
      </button>
    </div>
  );
}
