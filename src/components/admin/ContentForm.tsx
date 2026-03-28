'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

interface ContentFormProps {
  initialData?: {
    id?: string;
    title: string;
    content: string;
    excerpt?: string;
    category: string;
    featured: boolean;
    published: boolean;
  };
}

const categories = [
  { value: 'NEWS', label: 'News' },
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
  { value: 'EVENT', label: 'Event' },
  { value: 'BLOG', label: 'Blog' },
];

export function ContentForm({ initialData }: ContentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    excerpt: initialData?.excerpt || '',
    category: initialData?.category || 'NEWS',
    featured: initialData?.featured || false,
    published: initialData?.published || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const method = initialData?.id ? 'PATCH' : 'POST';
      const url = initialData?.id ? `/api/content/${initialData.id}` : '/api/content';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/admin/content');
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving content:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-6 pt-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={e => setFormData({ ...formData, featured: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Featured</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.published}
              onChange={e => setFormData({ ...formData, published: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Published</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt (optional)</label>
        <input
          type="text"
          value={formData.excerpt}
          onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Short summary for cards..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
        <RichTextEditor
          content={formData.content}
          onChange={html => setFormData({ ...formData, content: html })}
        />
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Content'}
        </button>
      </div>
    </form>
  );
}
