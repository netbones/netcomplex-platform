'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { contentSchema, type ContentFormData } from '@/lib/schemas';

interface ContentFormProps {
  initialData?: Partial<ContentFormData> & { id?: string };
  groups?: { id: string; name: string }[];
}

const categories = [
  { value: 'NEWS', label: 'News' },
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
  { value: 'EVENT', label: 'Event' },
  { value: 'BLOG', label: 'Blog' },
];

export function ContentForm({ initialData, groups = [] }: ContentFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      excerpt: initialData?.excerpt || '',
      category: initialData?.category || 'BLOG',
      groupId: initialData?.groupId || '',
      featured: initialData?.featured || false,
      published: initialData?.published || false,
    },
  });

  const onSubmit = async (data: ContentFormData) => {
    try {
      const method = initialData?.id ? 'PATCH' : 'POST';
      const url = initialData?.id ? `/api/content/${initialData.id}` : '/api/content';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push('/admin/content');
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving content:', error);
    }
  };

  const content = watch('content');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
        <input
          type="text"
          {...register('title')}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            {...register('category')}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {groups.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interest Group (optional)
            </label>
            <select
              {...register('groupId')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">None (General)</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('featured')}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Featured</span>
          </label>
        </div>

        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('published')}
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
          {...register('excerpt')}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Short summary for cards..."
        />
        {errors.excerpt && <p className="mt-1 text-sm text-red-600">{errors.excerpt.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
        <RichTextEditor
          content={content || ''}
          onChange={html => setValue('content', html, { shouldValidate: true })}
        />
        {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
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
