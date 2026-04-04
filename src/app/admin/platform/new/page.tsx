'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TenantFormData {
  name: string;
  slug: string;
  customDomain: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  fontFamily: string;
  active: boolean;
}

export default function NewTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    customDomain: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#4F46E5',
    accentColor: '#F59E0B',
    secondaryColor: '#10B981',
    fontFamily: 'Inter',
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create tenant');

      router.push('/admin/platform');
    } catch (error) {
      console.error(error);
      alert('Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof TenantFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'name' && !formData.slug) {
      const slug = value
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Create New Tenant</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="Soralia Village"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Slug</label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={e => handleChange('slug', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="soralia"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Custom Domain</label>
            <input
              type="text"
              value={formData.customDomain}
              onChange={e => handleChange('customDomain', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="soralia-village.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Logo URL</label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={e => handleChange('logoUrl', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Primary Color</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={formData.primaryColor}
                onChange={e => handleChange('primaryColor', e.target.value)}
                className="h-10 w-10 rounded border border-gray-300"
              />
              <input
                type="text"
                value={formData.primaryColor}
                onChange={e => handleChange('primaryColor', e.target.value)}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Accent Color</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={formData.accentColor}
                onChange={e => handleChange('accentColor', e.target.value)}
                className="h-10 w-10 rounded border border-gray-300"
              />
              <input
                type="text"
                value={formData.accentColor}
                onChange={e => handleChange('accentColor', e.target.value)}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Secondary Color</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={formData.secondaryColor}
                onChange={e => handleChange('secondaryColor', e.target.value)}
                className="h-10 w-10 rounded border border-gray-300"
              />
              <input
                type="text"
                value={formData.secondaryColor}
                onChange={e => handleChange('secondaryColor', e.target.value)}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Font Family</label>
            <input
              type="text"
              value={formData.fontFamily}
              onChange={e => handleChange('fontFamily', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder="Inter"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={e => handleChange('active', e.target.checked)}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
              Active
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Tenant'}
          </button>
        </div>
      </form>
    </div>
  );
}
