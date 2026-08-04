'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ContentForm } from '@widgets/admin';
import { createComponentLogger } from '@shared/lib';
import { apiGet } from '@/shared/api/http-client';

const log = createComponentLogger('edit-content-page');

interface Content {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string;
  groupId: string | null;
  tags: string[];
  featured: boolean;
  published: boolean;
  _raw?: {
    title: Record<string, string>;
    content: Record<string, string>;
    excerpt: Record<string, string> | null;
  };
}

export default function EditContentPage() {
  const params = useParams() as { id?: string } | null;
  const id = params?.id;
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    apiGet<Content>(`/api/content/${id}`)
      .then(({ data }) => {
        setContent(data);
        setLoading(false);
      })
      .catch(err => {
        log.error({}, 'Failed to fetch content', err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!content) {
    return <div className="p-8 text-center">Content not found</div>;
  }

  const initialData = {
    id: content.id,
    title: content._raw?.title || { en: content.title },
    content: content._raw?.content || { en: content.content },
    excerpt: content._raw?.excerpt || (content.excerpt ? { en: content.excerpt } : undefined),
    category: content.category as 'NEWS' | 'ANNOUNCEMENT' | 'EVENT' | 'BLOG',
    groupId: content.groupId || null,
    tags: content.tags || [],
    featured: content.featured,
    published: content.published,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Content</h1>
      <ContentForm initialData={initialData} />
    </div>
  );
}
