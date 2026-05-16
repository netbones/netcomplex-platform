'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { adminCompetitionSchema, type AdminCompetitionFormData } from '@api/schemas';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('CompetitionForm');

interface CompetitionFormProps {
  initialData?: {
    id?: string;
    title?: string;
    description?: string | null;
    rules?: string | null;
    prizeInfo?: string | null;
    startDate?: string;
    endDate?: string;
    status?: string;
    image?: string | null;
  };
}

/**
 * Convert Date objects or ISO strings to datetime-local format for inputs.
 */
function formatForInput(value: unknown): string {
  if (!value) return '';
  const d =
    typeof value === 'string'
      ? new Date(value)
      : value instanceof Date
        ? value
        : new Date(String(value));
  // datetime-local expects YYYY-MM-DDTHH:MM format
  return d.toISOString().slice(0, 16);
}

function getInitialDefaultValues(
  initialData?: CompetitionFormProps['initialData']
): AdminCompetitionFormData {
  return {
    title: initialData?.title || '',
    description: initialData?.description || '',
    rules: initialData?.rules || '',
    prizeInfo: initialData?.prizeInfo || '',
    startDate: initialData?.startDate ? formatForInput(initialData.startDate) : '',
    endDate: initialData?.endDate ? formatForInput(initialData.endDate) : '',
    image: initialData?.image || '',
    status: (initialData?.status as 'DRAFT' | 'ACTIVE' | 'ENDED' | 'CANCELLED') || 'DRAFT',
  };
}

export function CompetitionForm({ initialData }: CompetitionFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<AdminCompetitionFormData>({
    resolver: zodResolver(adminCompetitionSchema),
    defaultValues: getInitialDefaultValues(initialData),
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Watch status for conditional UI (e.g., color coding)
  const currentStatus = watch('status');

  const statusColors: Record<string, string> = {
    DRAFT: 'text-gray-600',
    ACTIVE: 'text-green-600',
    ENDED: 'text-blue-600',
    CANCELLED: 'text-red-600',
  };

  const onSubmit = async (data: AdminCompetitionFormData) => {
    const loadingToast = toast.loading(
      isEditing ? 'Updating competition...' : 'Creating competition...'
    );

    try {
      const method = isEditing ? 'PATCH' : 'POST';
      const url = isEditing ? `/api/competitions/${initialData.id}` : '/api/competitions';

      const body = {
        ...data,
        description: data.description || null,
        rules: data.rules || null,
        prizeInfo: data.prizeInfo || null,
        image: data.image || null,
        status: data.status,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(isEditing ? 'Competition updated!' : 'Competition created!');
        router.push('/admin/competitions');
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save competition');
      }
    } catch (error) {
      log.error({}, 'Error saving competition', error);
      toast.error('Something went wrong');
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;

    const loadingToast = toast.loading('Deleting competition...');

    try {
      const res = await fetch(`/api/competitions/${initialData.id}`, { method: 'DELETE' });

      if (res.ok) {
        toast.success('Competition deleted');
        router.push('/admin/competitions');
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete competition');
      }
    } catch (error) {
      log.error({}, 'Error deleting competition', error);
      toast.error('Something went wrong');
    } finally {
      toast.dismiss(loadingToast);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('title')}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.title ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Competition title"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          {...register('description')}
          rows={3}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.description ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Competition description"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Status (edit mode only) */}
      {isEditing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            {...register('status')}
            className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.status ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ENDED">ENDED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          {currentStatus && (
            <p className={`mt-1 text-xs ${statusColors[currentStatus] || 'text-gray-500'}`}>
              Current: {currentStatus}
            </p>
          )}
          {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
        </div>
      )}

      {/* Rules */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rules</label>
        <textarea
          {...register('rules')}
          rows={4}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.rules ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Competition rules and guidelines"
        />
        {errors.rules && <p className="mt-1 text-sm text-red-600">{errors.rules.message}</p>}
      </div>

      {/* Prize Info */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Prize Information</label>
        <textarea
          {...register('prizeInfo')}
          rows={2}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.prizeInfo ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Prize description"
        />
        {errors.prizeInfo && (
          <p className="mt-1 text-sm text-red-600">{errors.prizeInfo.message}</p>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            {...register('startDate')}
            className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.startDate ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            {...register('endDate')}
            className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.endDate ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
        </div>
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hero Image URL (optional)
        </label>
        <input
          type="text"
          {...register('image')}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.image ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="https://example.com/competition-image.jpg"
        />
        {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div>
          {isEditing && (
            <>
              {!deleteConfirmOpen ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="px-4 py-2 text-red-600 hover:text-red-800 text-sm"
                >
                  Delete Competition
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Are you sure?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(false)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex space-x-4">
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
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Competition' : 'Create Competition'}
          </button>
        </div>
      </div>
    </form>
  );
}
