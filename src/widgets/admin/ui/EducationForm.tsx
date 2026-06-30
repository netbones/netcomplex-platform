'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSafeTranslation } from '@shared/lib';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('EducationForm');

interface BursaryItem {
  id?: string;
  title: string;
  org: string;
  field: string;
  amount: string;
  period: string;
  desc: string;
  deadline: string;
  status: 'open' | 'closing' | 'closed';
}

interface ResourceItem {
  id?: string;
  title: string;
  org: string;
  type: string;
  desc: string;
  link: string;
  tags: string[];
}

interface EducationFormProps {
  initialData?: BursaryItem | ResourceItem;
}

export function EducationForm({ initialData }: EducationFormProps) {
  const { tx } = useSafeTranslation('admin');
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get('type') || 'bursary';
  const isBursary = type === 'bursary';

  const [formData, setFormData] = useState<BursaryItem | ResourceItem>(
    initialData ||
      (isBursary
        ? {
            title: '',
            org: '',
            field: 'STEM',
            amount: '',
            period: 'per year',
            desc: '',
            deadline: '',
            status: 'open' as const,
          }
        : { title: '', org: '', type: 'Course', desc: '', link: '', tags: [] })
  );
  const [saving, setSaving] = useState(false);

  const handleChange = (key: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/education', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bursaries: isBursary ? [formData as BursaryItem] : [],
          resources: !isBursary ? [formData as ResourceItem] : [],
        }),
      });
      if (res.ok) {
        router.push('/admin/education');
      }
    } catch (err) {
      log.error({}, 'Failed to save education item', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      {isBursary ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={(formData as BursaryItem).title}
              onChange={e => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <input
              type="text"
              value={(formData as BursaryItem).org}
              onChange={e => handleChange('org', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
              <select
                value={(formData as BursaryItem).field}
                onChange={e => handleChange('field', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="STEM">STEM</option>
                <option value="Commerce">Commerce</option>
                <option value="Arts">Arts & Humanities</option>
                <option value="Health">Health Sciences</option>
                <option value="Law">Law</option>
                <option value="Education">Education</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={(formData as BursaryItem).status}
                onChange={e =>
                  handleChange('status', e.target.value as 'open' | 'closing' | 'closed')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="open">Open</option>
                <option value="closing">Closing Soon</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="text"
                value={(formData as BursaryItem).amount}
                onChange={e => handleChange('amount', e.target.value)}
                placeholder="R60 000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
              <input
                type="text"
                value={(formData as BursaryItem).deadline}
                onChange={e => handleChange('deadline', e.target.value)}
                placeholder="31 Mar 2026"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={(formData as BursaryItem).desc}
              onChange={e => handleChange('desc', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={(formData as ResourceItem).title}
              onChange={e => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <input
              type="text"
              value={(formData as ResourceItem).org}
              onChange={e => handleChange('org', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={(formData as ResourceItem).type}
              onChange={e => handleChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="Book">Book</option>
              <option value="Course">Course</option>
              <option value="Journal">Journal</option>
              <option value="Video">Video</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
            <input
              type="url"
              value={(formData as ResourceItem).link}
              onChange={e => handleChange('link', e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={(formData as ResourceItem).desc}
              onChange={e => handleChange('desc', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : tx('save', 'Save')}
        </button>
        <button
          onClick={() => router.push('/admin/education')}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
