'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Content {
  id: string;
  title: string;
  excerpt: string | null;
  category: string;
  published: boolean;
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
  author: { name: string | null } | null;
}

export default function ContentListPage() {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content')
      .then(res => res.json())
      .then(data => {
        setContent(data);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    const res = await fetch(`/api/content/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setContent(content.filter(c => c.id !== id));
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
        <Link
          href="/admin/content/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <i className="fas fa-plus mr-2"></i>New Content
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Author
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {content.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{item.title}</div>
                  {item.excerpt && (
                    <div className="text-sm text-gray-500 truncate max-w-xs">{item.excerpt}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      item.category === 'NEWS'
                        ? 'bg-blue-100 text-blue-800'
                        : item.category === 'ANNOUNCEMENT'
                          ? 'bg-purple-100 text-purple-800'
                          : item.category === 'EVENT'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.author?.name || 'Unknown'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    {item.featured && (
                      <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded">
                        Featured
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 text-xs rounded ${item.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      {item.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.publishedAt
                    ? new Date(item.publishedAt).toLocaleDateString()
                    : new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Link
                    href={`/admin/content/${item.id}`}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <i className="fas fa-edit"></i>
                  </Link>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {content.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No content yet. Create your first article!
          </div>
        )}
      </div>
    </div>
  );
}
