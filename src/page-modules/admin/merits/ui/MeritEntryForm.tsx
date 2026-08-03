'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { BEHAVIOR_POINTS } from '@entities/merit';
import { apiPost, ApiClientError } from '@/shared/api/http-client';

const BEHAVIOR_TYPES = [
  { value: 'MERIT', label: 'Merit', points: BEHAVIOR_POINTS.MERIT, type: 'recognition' as const },
  {
    value: 'WARNING',
    label: 'Warning',
    points: BEHAVIOR_POINTS.WARNING,
    type: 'disciplinary' as const,
  },
  {
    value: 'INFRACTION',
    label: 'Infraction',
    points: BEHAVIOR_POINTS.INFRACTION,
    type: 'disciplinary' as const,
  },
] as const;

const CATEGORIES = [
  'COMMUNITY_SERVICE',
  'VOLUNTEERISM',
  'MAINTENANCE',
  'NOISE',
  'PARKING',
  'SECURITY',
  'PETS',
  'COMPLIANCE',
  'OTHER',
] as const;

export function MeritEntryForm() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [behaviorType, setBehaviorType] = useState<string>('MERIT');
  const [category, setCategory] = useState<string>('OTHER');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedType = BEHAVIOR_TYPES.find(t => t.value === behaviorType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiPost('/api/merits', {
        userId,
        behaviorType,
        category,
        reason,
        description: description || undefined,
      });
      router.push('/admin/merits');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'Failed to create record');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/merits" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Record Entry</h1>
          <p className="text-sm text-gray-500 mt-1">Create a new behavior record</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">User ID</label>
          <input
            type="text"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Behavior Type</label>
          <select
            value={behaviorType}
            onChange={e => setBehaviorType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {BEHAVIOR_TYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {selectedType && (
            <p className="text-xs mt-1 text-gray-500">
              {selectedType.type === 'recognition'
                ? `Awards +${selectedType.points} Recognition`
                : `Records ${selectedType.points} Penalty Points`}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            minLength={3}
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full text-white py-2 px-4 rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#4F46E5' }}
        >
          <Shield className="w-4 h-4" />
          {loading ? 'Recording...' : 'Record Entry'}
        </button>
      </form>
    </div>
  );
}
