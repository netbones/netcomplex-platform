'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Breadcrumbs } from '@shared/ui';
import { useLanguage } from '@shared/lib/hooks/useSafeTranslation';

interface Content {
  id: string;
  title: string;
  excerpt: string | null;
  category: string;
  published: boolean;
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
  license: string;
  copyrightHolder: string | null;
  moderationStatus: string;
  viewCount: number;
  author: { name: string | null } | null;
}

const LICENSE_LABELS: Record<string, string> = {
  CC0: 'CC0 — Public Domain',
  CC_BY: 'CC BY — Attribution',
  CC_BY_SA: 'CC BY-SA — ShareAlike',
  CC_BY_NC: 'CC BY-NC — Non-Commercial',
  ALL_RIGHTS_RESERVED: 'All Rights Reserved',
};

const MODERATION_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  UNPUBLISHED: 'Unpublished',
  FLAGGED: 'Flagged',
};

const MODERATION_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  UNPUBLISHED: 'bg-red-100 text-red-800',
  FLAGGED: 'bg-amber-100 text-amber-800',
};

export default function ContentListPage() {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { language } = useLanguage();

  useEffect(() => {
    fetch(`/api/content?locale=${language}`)
      .then(res => res.json())
      .then(data => {
        setContent(data.data ?? []);
        setLoading(false);
      });
  }, [language]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;
    const res = await fetch(`/api/content/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setContent(content.filter(c => c.id !== id));
    }
  };

  const handleModerate = async (id: string, moderationStatus: string) => {
    const res = await fetch(`/api/content/${id}/moderate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moderationStatus }),
    });
    if (res.ok) {
      setContent(
        content.map(c =>
          c.id === id ? { ...c, moderationStatus, published: moderationStatus === 'PUBLISHED' } : c
        )
      );
    }
  };

  const isCreativeCommons = (license: string) => license.startsWith('CC');

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Content Management' }]} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Image src="/platform/content.svg" alt="" width={32} height={32} />
          Content Management
        </h1>
        <Link
          href="/admin/content/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <i className="fas fa-plus mr-2"></i>New Content
        </Link>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <strong>Moderation model:</strong> Admin can publish platform-owned content directly. For
        user-generated content, moderators should unpublish or flag rather than editing — this
        preserves creator rights. Each tenant configures their own policy.
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-[800px] w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                Author
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                Mod.
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {content.map(item => (
              <>
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleExpand(item.id)}
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{item.title}</div>
                    {item.excerpt && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{item.excerpt}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {item.author?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {item.featured && (
                        <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded">
                          Featured
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs rounded ${item.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                      >
                        {item.published ? 'Pub.' : 'Draft'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded ${MODERATION_COLORS[item.moderationStatus] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {MODERATION_LABELS[item.moderationStatus] || item.moderationStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {item.publishedAt
                      ? new Date(item.publishedAt).toLocaleDateString()
                      : new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                    <Link
                      href={`/admin/content/${item.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                      onClick={e => e.stopPropagation()}
                    >
                      <i className="fas fa-edit"></i>
                    </Link>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
                {expandedId === item.id && (
                  <tr key={`${item.id}-detail`} className="bg-gray-50">
                    <td colSpan={7} className="px-6 py-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <dt className="font-medium text-gray-700">Platform URL</dt>
                          <dd>
                            <Link
                              href={`/content/${item.id}`}
                              className="text-indigo-600 hover:underline"
                            >
                              /content/{item.id}
                            </Link>
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-700">Views</dt>
                          <dd>{item.viewCount}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-700">Author</dt>
                          <dd>{item.author?.name || 'Unknown'}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-700">License</dt>
                          <dd className={isCreativeCommons(item.license) ? 'text-green-700' : ''}>
                            {LICENSE_LABELS[item.license] || item.license}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-700">Copyright</dt>
                          <dd>
                            {item.copyrightHolder
                              ? `\u00a9 ${item.copyrightHolder}`
                              : isCreativeCommons(item.license)
                                ? 'User-generated (CC)'
                                : 'Platform-owned'}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-700">Moderation</dt>
                          <dd>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.moderationStatus !== 'PUBLISHED' && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleModerate(item.id, 'PUBLISHED');
                                  }}
                                  className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                                >
                                  Publish
                                </button>
                              )}
                              {item.moderationStatus !== 'UNPUBLISHED' && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleModerate(item.id, 'UNPUBLISHED');
                                  }}
                                  className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                                >
                                  Unpublish
                                </button>
                              )}
                              {item.moderationStatus !== 'FLAGGED' && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleModerate(item.id, 'FLAGGED');
                                  }}
                                  className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                                >
                                  Flag
                                </button>
                              )}
                            </div>
                          </dd>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
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
