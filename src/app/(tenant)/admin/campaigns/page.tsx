'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('admin-campaigns');

interface CampaignItem {
  id: string;
  title: Record<string, string> | string;
  excerpt: Record<string, string> | string | null;
  image: string | null;
  category: string;
  published: boolean;
  featured: boolean;
  contentType: string;
  publishedAt: string | null;
  createdAt: string;
  author: { name: string | null } | null;
}

const LICENSE_OPTIONS = [
  { value: 'CC0', label: 'CC0 — Public Domain' },
  { value: 'CC_BY', label: 'CC BY — Attribution' },
  { value: 'CC_BY_SA', label: 'CC BY-SA — ShareAlike' },
  { value: 'CC_BY_NC', label: 'CC BY-NC — Non-Commercial' },
  { value: 'ALL_RIGHTS_RESERVED', label: 'All Rights Reserved' },
];

function emptyForm() {
  return {
    title: '',
    excerpt: '',
    content: '',
    image: '',
  };
}

function getTitle(item: CampaignItem): string {
  if (typeof item.title === 'string') return item.title;
  return item.title?.en ?? Object.values(item.title ?? {})[0] ?? '';
}

export default function AdminCampaignsPage() {
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch('/api/content');
      const data = await res.json();
      const campaigns = (data.data ?? data ?? []).filter(
        (c: CampaignItem) => c.category === 'CAMPAIGN'
      );
      setItems(campaigns);
    } catch (err) {
      log.error({}, 'Failed to load campaigns', err);
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleEdit = (item: CampaignItem) => {
    setEditingId(item.id);
    setForm({
      title: typeof item.title === 'string' ? item.title : (item.title?.en ?? ''),
      excerpt: typeof item.excerpt === 'string' ? item.excerpt : (item.excerpt?.en ?? ''),
      content: '',
      image: item.image ?? '',
    });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: { en: form.title },
        excerpt: form.excerpt ? { en: form.excerpt } : undefined,
        content: { en: form.content || form.title },
        image: form.image || undefined,
        category: 'CAMPAIGN',
        published: true,
        contentType: 'campaign',
        defaultLocale: 'en',
        tags: [],
      };

      const url = editingId ? `/api/content/${editingId}` : '/api/content';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
      });

      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        loadItems();
      } else {
        const body = await res.json();
        setError(body?.message ?? body?.error ?? 'Failed to save');
      }
    } catch (err) {
      log.error({}, 'Failed to save campaign', err);
      setError('Failed to save campaign');
    } finally {
      setSaving(false);
    }
  }, [form, editingId, loadItems]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      const res = await fetch(`/api/content/${id}`, { method: 'DELETE' });
      if (res.ok) loadItems();
      else setError('Failed to delete');
    } catch {
      setError('Failed to delete');
    }
  };

  const handleToggle = async (id: string, published: boolean) => {
    try {
      await fetch(`/api/content/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, published: !published }),
      });
      loadItems();
    } catch {
      setError('Failed to toggle');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Campaigns' }]} />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-soralia-dark">Campaigns</h1>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-soralia-primary text-white rounded-lg hover:bg-soralia-primary/90 transition-colors"
          >
            + Create Campaign
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-4">
              {editingId ? 'Edit Campaign' : 'New Campaign'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary/50"
                  placeholder="Campaign title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Excerpt</label>
                <input
                  type="text"
                  value={form.excerpt}
                  onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary/50"
                  placeholder="Brief description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Image URL</label>
                <input
                  type="text"
                  value={form.image}
                  onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary/50"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Content</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary/50"
                  placeholder="Campaign content body..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}
                  className="px-4 py-2 bg-soralia-primary text-white rounded-lg hover:bg-soralia-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {items.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No campaigns yet. Click &quot;Create Campaign&quot; to add one.
            </div>
          )}

          {items.map(item => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4"
            >
              {item.image && (
                <img
                  src={item.image}
                  alt={getTitle(item)}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800 truncate">{getTitle(item)}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      item.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                {item.excerpt && (
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {typeof item.excerpt === 'string' ? item.excerpt : (item.excerpt?.en ?? '')}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Created {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/news/${item.id}`}
                  className="text-xs text-soralia-primary hover:underline"
                  target="_blank"
                >
                  View
                </Link>
                <button
                  onClick={() => handleToggle(item.id, item.published)}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  {item.published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => handleEdit(item)}
                  className="text-xs text-soralia-primary hover:text-soralia-primary/80"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}
