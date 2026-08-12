'use client';

import { useState, useEffect } from 'react';
import { Breadcrumbs } from '@shared/ui';
import { DomainIconBadge } from '@widgets/dashboard';
import { apiGet, apiPost } from '@/shared/api/http-client';

export default function GroupCategoriesPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiGet<{ value?: string }>('/api/settings?key=interest_categories')
      .then(({ data }) => {
        if (data.value) {
          setCategories(JSON.parse(data.value));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPost('/api/settings', {
        key: 'interest_categories',
        value: JSON.stringify(categories),
      });
      setMessage('Categories saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    if (newCategory && !categories.includes(newCategory.toLowerCase())) {
      setCategories([...categories, newCategory.toLowerCase()]);
      setNewCategory('');
    }
  };

  const handleRemove = (cat: string) => {
    setCategories(categories.filter(c => c !== cat));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Group Categories' },
        ]}
      />

      <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
        <DomainIconBadge id="categories" variant="admin" size="md" />
        Interest Group Categories
      </h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 mb-4">
            Manage the categories available for interest groups. Categories are used to organize
            groups on the Groups page.
          </p>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="New category name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(cat => (
              <span
                key={cat}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full flex items-center gap-2"
              >
                {cat}
                <button
                  onClick={() => handleRemove(cat)}
                  className="text-red-500 hover:text-red-700"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>

          {categories.length === 0 && <p className="text-gray-500 mb-4">No categories defined.</p>}

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {message && (
              <span className={message.includes('Failed') ? 'text-red-600' : 'text-green-600'}>
                {message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
