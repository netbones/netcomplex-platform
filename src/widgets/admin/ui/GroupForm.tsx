'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { groupSchema, type GroupFormData } from '@api/shared';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('GroupForm');

const categories = [
  { value: 'gardening', label: 'Gardening' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'book-club', label: 'Book Club' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'photography', label: 'Photography' },
  { value: 'volunteering', label: 'Volunteering' },
  { value: 'music', label: 'Music' },
  { value: 'art', label: 'Art & Crafts' },
  { value: 'other', label: 'Other' },
];

interface GroupFormProps {
  initialData?: Partial<GroupFormData> & { id?: string };
}

export function GroupForm({ initialData }: GroupFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      category: initialData?.category || 'other',
      isPublic: initialData?.isPublic ?? true,
    },
  });

  const onSubmit = async (data: GroupFormData) => {
    try {
      const method = initialData?.id ? 'PATCH' : 'POST';
      const url = initialData?.id ? `/api/groups/${initialData.id}` : '/api/groups';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push('/admin/groups');
        router.refresh();
      }
    } catch (error) {
      log.error({}, 'Error saving group', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
        <input
          type="text"
          {...register('name')}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          {...register('description')}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
          placeholder="What is this group about?"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            {...register('category')}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center pt-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('isPublic')}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Public group (visible to all residents)
            </span>
          </label>
        </div>
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
          {isSubmitting ? 'Saving...' : 'Save Group'}
        </button>
      </div>
    </form>
  );
}
