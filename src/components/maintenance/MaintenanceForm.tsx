'use client';

import { useState } from 'react';

interface MaintenanceFormProps {
  onSubmit?: (data: MaintenanceRequest) => Promise<void>;
}

interface MaintenanceRequest {
  category: string;
  priority: string;
  description: string;
}

const categories = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC/Climate' },
  { value: 'structural', label: 'Structural' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'common_area', label: 'Common Area' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

const priorities = [
  { value: 'LOW', label: 'Low - Minor inconvenience' },
  { value: 'MEDIUM', label: 'Medium - Needs attention soon' },
  { value: 'HIGH', label: 'High - Urgent issue' },
  { value: 'EMERGENCY', label: 'Emergency - Immediate danger' },
];

export function MaintenanceForm({ onSubmit }: MaintenanceFormProps) {
  const [formData, setFormData] = useState<MaintenanceRequest>({
    category: '',
    priority: 'MEDIUM',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        const res = await fetch('/api/maintenance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          throw new Error('Failed to submit request');
        }

        alert('Maintenance request submitted successfully!');
        setFormData({ category: '', priority: 'MEDIUM', description: '' });
      }
    } catch (err) {
      setError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
        <select
          required
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value })}
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
          onChange={e => setFormData({ ...formData, priority: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        >
          {priorities.map(p => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
        <textarea
          required
          rows={5}
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Please describe the issue in detail..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        />
      </div>

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
