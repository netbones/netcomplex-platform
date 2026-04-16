import { NewTenantForm } from '@features/admin';

export function NewTenantPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Create New Tenant</h1>
      <NewTenantForm />
    </div>
  );
}
