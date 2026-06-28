'use client';

import { useMaintenanceForm, categories, priorities } from '../model/useMaintenanceForm';
import { MaintenanceRequestForm, MaintenancePriority } from '@entities/maintenance';

interface MaintenanceFormProps {
  onSubmit?: (data: MaintenanceRequestForm) => Promise<void>;
  propertyId?: string | null;
}

export function MaintenanceForm({ onSubmit, propertyId }: MaintenanceFormProps) {
  const {
    formData,
    submitting,
    error,
    uploading,
    routingHint,
    fileInputRef,
    handleFileChange,
    removeImage,
    handleSubmit,
    updateFormData,
  } = useMaintenanceForm(onSubmit, propertyId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
        <select
          required
          value={formData.category}
          onChange={e => updateFormData({ category: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        >
          <option value="">Select a category</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
        <select
          required
          value={formData.priority}
          onChange={e => updateFormData({ priority: e.target.value as MaintenancePriority })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        >
          {priorities.map(p => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {routingHint && (
        <div
          className={`rounded-md border px-3 py-2 text-sm flex items-center gap-2 ${
            routingHint === 'LANDLORD'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-blue-200 bg-blue-50 text-blue-800'
          }`}
        >
          {routingHint === 'LANDLORD' ? (
            <>
              <span>🏠</span>
              <span>
                This request will be sent to your <strong>landlord</strong> to arrange. The HOA will
                not be notified.
              </span>
            </>
          ) : (
            <>
              <span>🏢</span>
              <span>
                This request will be sent to the <strong>HOA management team</strong>.
              </span>
            </>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
        <textarea
          required
          rows={5}
          value={formData.description}
          onChange={e => updateFormData({ description: e.target.value })}
          placeholder="Please describe the issue in detail..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photos (optional, max 5)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        />
        {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
      </div>

      {formData.images && formData.images.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Attached Photos</label>
          <div className="grid grid-cols-3 gap-2">
            {formData.images.map((url, index) => (
              <div key={url} className="relative group">
                <img
                  src={url}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-soralia-primary text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
}
