'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { toast } from 'sonner';

interface CreateListingFormProps {
  householdId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Household {
  id: string;
  street: string;
  unit: string;
  platformAddress: string;
}

export function CreateListingForm({ householdId, onClose, onSuccess }: CreateListingFormProps) {
  const { t } = useTranslation('dashboard');
  const [loading, setLoading] = useState(false);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [formData, setFormData] = useState({
    householdId: householdId || '',
    listingType: 'SALE',
    title: '',
    description: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    parkingSpaces: '',
    gardenSize: '',
    petFriendly: false,
  });

  // Fetch user's households if not provided
  useState(() => {
    if (!householdId) {
      fetchHouseholds();
    }
  });

  const fetchHouseholds = async () => {
    try {
      const response = await fetch('/api/premium/portfolio');
      const data = await response.json();
      if (data.hasPortfolio && data.portfolio.linkedHouseholds) {
        setHouseholds(data.portfolio.linkedHouseholds);
      }
    } catch (error) {
      toast.error('Failed to fetch households');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/premium/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert(data.error || 'Failed to create listing');
      }
    } catch (error) {
      toast.error('Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create Property Listing</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Property Selection */}
              {!householdId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Property
                  </label>
                  <select
                    value={formData.householdId}
                    onChange={e => handleInputChange('householdId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Choose a property...</option>
                    {households.map(household => (
                      <option key={household.id} value={household.id}>
                        {household.street} {household.unit}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Listing Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Listing Type</label>
                <select
                  value={formData.listingType}
                  onChange={e => handleInputChange('listingType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="SALE">For Sale</option>
                  <option value="RENT">For Rent</option>
                  <option value="LEASE">For Lease</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Listing Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Beautiful 3BR Home in Quiet Neighborhood"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe your property..."
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price (ZAR)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={e => handleInputChange('price', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 2500000"
                />
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                  <input
                    type="number"
                    value={formData.bedrooms}
                    onChange={e => handleInputChange('bedrooms', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                  <input
                    type="number"
                    value={formData.bathrooms}
                    onChange={e => handleInputChange('bathrooms', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    step="0.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parking Spaces
                  </label>
                  <input
                    type="number"
                    value={formData.parkingSpaces}
                    onChange={e => handleInputChange('parkingSpaces', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Garden Size (m²)
                  </label>
                  <input
                    type="number"
                    value={formData.gardenSize}
                    onChange={e => handleInputChange('gardenSize', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              {/* Pet Friendly */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="petFriendly"
                  checked={formData.petFriendly}
                  onChange={e => handleInputChange('petFriendly', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="petFriendly" className="ml-2 block text-sm text-gray-700">
                  Pet Friendly
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
