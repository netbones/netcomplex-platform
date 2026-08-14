'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toastPromise, ToastMsg } from '@shared/lib/hooks';
import { adminEventSchema, type AdminEventFormData } from '@entities/event';
import { apiPatch, apiPost, apiDelete } from '@/shared/api/http-client';

interface EventFormProps {
  redirectPath?: string;
  initialData?: {
    id?: string;
    title?: string;
    description?: string;
    date?: string;
    endDate?: string | null;
    location?: string;
    organizer?: string;
    image?: string | null;
    isPublic?: boolean;
    isDraft?: boolean;
    category?: string | null;
    maxAttendees?: number | null;
    createdByUserId?: string | null;
  };
}

/**
 * Convert Date objects or ISO strings to YYYY-MM-DD format for date inputs.
 * Uses local timezone methods to avoid UTC date shifts near midnight.
 */
function formatForDatePicker(value: unknown): string {
  if (!value) return '';
  const d =
    typeof value === 'string'
      ? new Date(value)
      : value instanceof Date
        ? value
        : new Date(String(value));
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatForDateTimePicker(value: unknown): string {
  if (!value) return '';
  const d =
    typeof value === 'string'
      ? new Date(value)
      : value instanceof Date
        ? value
        : new Date(String(value));
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function getInitialDefaultValues(initialData?: EventFormProps['initialData']): AdminEventFormData {
  return {
    title: initialData?.title || '',
    description: initialData?.description || '',
    date: initialData?.date ? formatForDatePicker(initialData.date) + 'T00:00' : '',
    endDate: initialData?.endDate ? formatForDateTimePicker(initialData.endDate) : '',
    location: initialData?.location || '',
    organizer: initialData?.organizer || '',
    image: initialData?.image || '',
    isPublic: initialData?.isPublic !== undefined ? initialData.isPublic : true,
    isDraft: initialData?.isDraft ?? false,
    category: initialData?.category ?? null,
    maxAttendees: initialData?.maxAttendees ?? null,
    createdByUserId: initialData?.createdByUserId ?? null,
  };
}

export function EventForm({ redirectPath = '/admin/events', initialData }: EventFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<AdminEventFormData>({
    resolver: zodResolver(adminEventSchema),
    defaultValues: getInitialDefaultValues(initialData),
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Controlled state for date input (type="date" doesn't support partial selection)
  const [dateDisplay, setDateDisplay] = useState(
    initialData?.date ? formatForDatePicker(initialData.date) : ''
  );

  const [endDateDisplay, setEndDateDisplay] = useState(
    initialData?.endDate ? formatForDateTimePicker(initialData.endDate) : ''
  );

  const onSubmit = async (data: AdminEventFormData) => {
    await toastPromise(
      (async () => {
        const body = {
          ...data,
          image: data.image || null,
          endDate: data.endDate || null,
        };

        if (isEditing) {
          await apiPatch(`/api/events/${initialData.id}`, body);
        } else {
          await apiPost('/api/events', body);
        }

        router.push(redirectPath);
        router.refresh();
      })(),
      {
        loading: isEditing ? 'Updating event...' : 'Creating event...',
        success: isEditing ? ToastMsg.updated('Event') : ToastMsg.created('Event'),
        error: ToastMsg.failedToSave('event'),
        component: 'EventForm',
      }
    );
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;

    await toastPromise(
      (async () => {
        await apiDelete(`/api/events/${initialData.id}`);
        router.push(redirectPath);
        router.refresh();
      })(),
      {
        loading: 'Deleting event...',
        success: ToastMsg.deleted('Event'),
        error: ToastMsg.failedToDelete('event'),
        component: 'EventForm',
      }
    );
    setDeleteConfirmOpen(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 max-w-2xl">
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
          placeholder="Event title"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.description ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Event description"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Date and Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={dateDisplay}
            onChange={e => {
              const val = e.target.value;
              setDateDisplay(val);
              setValue('date', val ? `${val}T00:00` : '', { shouldValidate: true });
            }}
            className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.date ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End time (optional)
          </label>
          <input
            type="datetime-local"
            value={endDateDisplay}
            onChange={e => {
              const val = e.target.value;
              setEndDateDisplay(val);
              setValue('endDate', val || '', { shouldValidate: true });
            }}
            className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.endDate ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('location')}
            className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.location ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Event location"
          />
          {errors.location && (
            <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
          )}
        </div>
      </div>

      {/* Organizer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Organizer <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('organizer')}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.organizer ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Event organizer"
        />
        {errors.organizer && (
          <p className="mt-1 text-sm text-red-600">{errors.organizer.message}</p>
        )}
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
        <input
          type="text"
          {...register('image')}
          className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.image ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="https://example.com/event-image.jpg"
        />
        {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>}
      </div>

      {/* isPublic */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          {...register('isPublic')}
          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label className="text-sm font-medium text-gray-700">Public event</label>
      </div>

      {/* isDraft */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          {...register('isDraft')}
          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label className="text-sm font-medium text-gray-700">Save as draft</label>
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
                  Delete Event
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
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </div>
    </form>
  );
}
