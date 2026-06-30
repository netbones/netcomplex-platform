'use client';

interface AccountSectionProps {
  role: string;
  planType: string;
}

export function AccountSection({ role, planType }: AccountSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <p className="mt-1 text-gray-900 capitalize">{role.toLowerCase() || 'resident'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Plan</label>
          <p className="mt-1 text-gray-900 capitalize">{planType || 'Loading...'}</p>
        </div>
      </div>
    </div>
  );
}
