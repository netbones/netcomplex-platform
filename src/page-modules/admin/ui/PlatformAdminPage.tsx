import { Suspense } from 'react';
import Link from 'next/link';
import { listTenants } from '@shared/api/tenant/base';

function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'success' | 'secondary' | 'default';
}) {
  const variants = {
    success: 'bg-green-100 text-green-800',
    secondary: 'bg-gray-100 text-gray-800',
    default: 'bg-gray-100 text-gray-800',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

async function TenantsList() {
  const tenants = await listTenants();

  if (tenants.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No tenants found. Create your first tenant to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Slug
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Domain
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tenants.map(tenant => (
            <tr key={tenant.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  {tenant.logoUrl && (
                    <img
                      src={tenant.logoUrl}
                      alt={tenant.name}
                      className="h-8 w-8 rounded-full mr-3"
                    />
                  )}
                  <span className="font-medium text-gray-900">{tenant.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-500">{tenant.slug}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                {tenant.customDomain || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant={tenant.active ? 'success' : 'secondary'}>
                  {tenant.active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                {new Date(tenant.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  href={`/admin/platform/${tenant.id}/features`}
                  className="text-indigo-600 hover:text-indigo-900 mr-4"
                >
                  Features
                </Link>
                <Link
                  href={`/admin/platform/${tenant.id}/edit`}
                  className="text-indigo-600 hover:text-indigo-900 mr-4"
                >
                  Edit
                </Link>
                <Link
                  href={`/${tenant.slug}`}
                  target="_blank"
                  className="text-gray-600 hover:text-gray-900"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlatformAdminPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Platform Admin</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage all tenants on the NetComplex platform.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4">
          <Link
            href="/admin/platform/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Add Tenant
          </Link>
        </div>
      </div>

      <div className="mt-8 bg-white shadow rounded-lg">
        <Suspense fallback={<div className="p-4">Loading tenants...</div>}>
          <TenantsList />
        </Suspense>
      </div>
    </div>
  );
}
