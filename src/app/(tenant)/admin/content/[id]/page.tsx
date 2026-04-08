'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ContentForm } from '@/components/admin/ContentForm';

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
}

export default function EditContentPage() {
  const params = useParams();
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    fetch(`/api/content/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error(data.error);
          return;
        }
        setContent(data);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!content) {
    return <div className="p-8 text-center">Content not found</div>;
  }

  const initialData = {
    id: content.id,
    title: { en: content.title },
    content: { en: content.content },
    excerpt: content.excerpt ? { en: content.excerpt } : undefined,
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
