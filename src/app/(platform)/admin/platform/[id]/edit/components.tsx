'use client';

import { useState, useTransition } from 'react';

interface TenantBrandingFormProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    customDomain: string | null;
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string;
    accentColor: string | null;
    secondaryColor: string | null;
    fontFamily: string | null;
    customCss: string | null;
  };
}

const FONTS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Raleway', label: 'Raleway' },
];

function BrandingForm({ tenant }: TenantBrandingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [previewLogo, setPreviewLogo] = useState(tenant.logoUrl);
  const [previewPrimary, setPreviewPrimary] = useState(tenant.primaryColor);
  const [previewAccent, setPreviewAccent] = useState(tenant.accentColor || '#F59E0B');
  const [previewSecondary, setPreviewSecondary] = useState(tenant.secondaryColor || '#10B981');

  const handleLogoUrlChange = (url: string) => {
    setPreviewLogo(url || null);
  };

  const handlePrimaryChange = (color: string) => {
    setPreviewPrimary(color);
  };

  const handleAccentChange = (color: string) => {
    setPreviewAccent(color);
  };

  const handleSecondaryChange = (color: string) => {
    setPreviewSecondary(color);
  };

  async function handleSubmit(formData: FormData) {
    const data = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
      customDomain: (formData.get('customDomain') as string) || null,
      logoUrl: (formData.get('logoUrl') as string) || null,
      faviconUrl: (formData.get('faviconUrl') as string) || null,
      primaryColor: formData.get('primaryColor') as string,
      accentColor: (formData.get('accentColor') as string) || null,
      secondaryColor: (formData.get('secondaryColor') as string) || null,
      fontFamily: (formData.get('fontFamily') as string) || null,
      customCss: (formData.get('customCss') as string) || null,
    };

    startTransition(async () => {
      await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      // Optionally redirect or show success
    });
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      <input type="hidden" name="id" value={tenant.id} />

      {/* Basic Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Tenant Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={tenant.name}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
              Slug
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              defaultValue={tenant.slug}
              required
              pattern="[a-z0-9-]+"
              title="Lowercase letters, numbers, and hyphens only"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="customDomain" className="block text-sm font-medium text-gray-700 mb-1">
              Custom Domain
            </label>
            <input
              type="text"
              id="customDomain"
              name="customDomain"
              defaultValue={tenant.customDomain || ''}
              placeholder="example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Logo & Favicon */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Logo & Icon</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Logo URL
            </label>
            <input
              type="url"
              id="logoUrl"
              name="logoUrl"
              defaultValue={tenant.logoUrl || ''}
              placeholder="https://example.com/logo.png"
              onChange={e => handleLogoUrlChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="faviconUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Favicon URL
            </label>
            <input
              type="url"
              id="faviconUrl"
              name="faviconUrl"
              defaultValue={tenant.faviconUrl || ''}
              placeholder="https://example.com/favicon.ico"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Logo Preview */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-2">Logo Preview</p>
          <div className="flex items-center gap-4">
            {previewLogo ? (
              <img
                src={previewLogo}
                alt="Logo preview"
                className="h-16 w-16 object-contain rounded"
              />
            ) : (
              <div className="h-16 w-16 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                No logo
              </div>
            )}
            <div
              className="h-12 px-4 rounded flex items-center text-white font-semibold"
              style={{ backgroundColor: previewPrimary }}
            >
              {tenant.name}
            </div>
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Brand Colors</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="primaryColorPicker"
                value={previewPrimary}
                onChange={e => handlePrimaryChange(e.target.value)}
                className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                id="primaryColor"
                name="primaryColor"
                defaultValue={tenant.primaryColor}
                pattern="^#[0-9A-Fa-f]{6}$"
                onChange={e => handlePrimaryChange(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
          <div>
            <label htmlFor="accentColor" className="block text-sm font-medium text-gray-700 mb-1">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="accentColorPicker"
                value={previewAccent}
                onChange={e => handleAccentChange(e.target.value)}
                className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                id="accentColor"
                name="accentColor"
                defaultValue={tenant.accentColor || '#F59E0B'}
                pattern="^#[0-9A-Fa-f]{6}$"
                onChange={e => handleAccentChange(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="secondaryColor"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="secondaryColorPicker"
                value={previewSecondary}
                onChange={e => handleSecondaryChange(e.target.value)}
                className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                id="secondaryColor"
                name="secondaryColor"
                defaultValue={tenant.secondaryColor || '#10B981'}
                pattern="^#[0-9A-Fa-f]{6}$"
                onChange={e => handleSecondaryChange(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Color Preview */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-2">Color Preview</p>
          <div className="flex gap-4">
            <div
              className="flex-1 h-16 rounded-lg flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: previewPrimary }}
            >
              Primary
            </div>
            <div
              className="flex-1 h-16 rounded-lg flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: previewAccent }}
            >
              Accent
            </div>
            <div
              className="flex-1 h-16 rounded-lg flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: previewSecondary }}
            >
              Secondary
            </div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Typography</h2>
        <div>
          <label htmlFor="fontFamily" className="block text-sm font-medium text-gray-700 mb-1">
            Font Family
          </label>
          <select
            id="fontFamily"
            name="fontFamily"
            defaultValue={tenant.fontFamily || 'Inter'}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            {FONTS.map(font => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Custom CSS */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Custom CSS</h2>
        <div>
          <label htmlFor="customCss" className="block text-sm font-medium text-gray-700 mb-1">
            Custom CSS (Advanced)
          </label>
          <textarea
            id="customCss"
            name="customCss"
            defaultValue={tenant.customCss || ''}
            rows={8}
            placeholder=".custom-element { ... }"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="mt-2 text-xs text-gray-500">
            Add custom styles that will be applied to this tenant&apos;s site. Use valid CSS syntax.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <a
          href="/dashboard/admin/platform"
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

export default BrandingForm;
